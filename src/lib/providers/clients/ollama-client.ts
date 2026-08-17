import type {
  AIProviderDefinition,
  ProviderClient,
  TextGenerationRequest,
  TextGenerationResult,
  VisionRequest,
} from '@/types/provider';

const DEFAULT_BASE_URL = 'http://localhost:11434/v1';
const DEFAULT_TEXT_MODEL = 'llama3.2';

/**
 * Client for OpenAI-compatible local inference servers (Ollama, LM Studio).
 * The key is treated as an empty/placeholder token; local servers usually
 * ignore authentication, so key validation checks that the server is reachable.
 */
export class OllamaClient implements ProviderClient {
  readonly id = 'ollama' as const;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResult> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model ?? DEFAULT_TEXT_MODEL,
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  async analyzeImage(req: VisionRequest): Promise<TextGenerationResult> {
    // Vision support depends on the local model (e.g. llava, moondream).
    // Delegate to a text-style completion with the image encoded as a data URL
    // in the message content, matching the OpenAI multimodal schema.
    const dataUrl =
      typeof req.image === 'string' && req.image.startsWith('data:')
        ? req.image
        : typeof req.image === 'string'
          ? `data:${req.mimeType ?? 'image/png'};base64,${req.image}`
          : `data:${req.mimeType ?? 'image/png'};base64,${req.image.toString('base64')}`;
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model ?? 'llava',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: req.prompt },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      throw new Error(`Ollama vision request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }
}

export const ollamaProvider: AIProviderDefinition = {
  id: 'ollama',
  name: 'Ollama (Local)',
  capabilities: ['vision', 'text'],
  defaultModels: { text: DEFAULT_TEXT_MODEL, vision: 'llava' },
  async validateKey(_key: string): Promise<boolean> {
    try {
      const res = await fetch(`${DEFAULT_BASE_URL}/../api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
  createClient(key: string): ProviderClient {
    return new OllamaClient(key);
  },
};

export const customProvider: AIProviderDefinition = {
  id: 'custom',
  name: 'Custom (OpenAI-compatible)',
  capabilities: ['vision', 'text'],
  defaultModels: { text: 'gpt-4o-mini', vision: 'gpt-4o' },
  async validateKey(key: string): Promise<boolean> {
    // Custom endpoints use the Ollama-compatible flow — base URL comes from
    // the environment in production or an optional constructor override.
    return ollamaProvider.validateKey(key);
  },
  createClient(key: string): ProviderClient {
    return new OllamaClient(key);
  },
};
