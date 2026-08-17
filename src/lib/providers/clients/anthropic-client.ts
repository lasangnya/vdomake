import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProviderDefinition,
  ProviderClient,
  TextGenerationRequest,
  TextGenerationResult,
  VisionRequest,
} from '@/types/provider';

const ANTHROPIC_MODELS_ENDPOINT = 'https://api.anthropic.com/v1/models';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class AnthropicClient implements ProviderClient {
  readonly id = 'anthropic' as const;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResult> {
    const message = await this.client.messages.create({
      model: req.model ?? DEFAULT_MODEL,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature,
      messages: req.messages,
    });
    return {
      text: extractText(message.content),
      model: message.model,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }

  async analyzeImage(req: VisionRequest): Promise<TextGenerationResult> {
    const [mimeType, b64] = imageParts(req);
    const message = await this.client.messages.create({
      model: req.model ?? DEFAULT_MODEL,
      max_tokens: req.maxTokens ?? 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: b64 },
            },
            { type: 'text', text: req.prompt },
          ],
        },
      ],
    });
    return {
      text: extractText(message.content),
      model: message.model,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function imageParts(req: VisionRequest): [ImageMediaType, string] {
  const normalize = (mime: string | undefined): ImageMediaType => {
    const value = mime ?? 'image/png';
    if (
      value === 'image/jpeg' ||
      value === 'image/png' ||
      value === 'image/gif' ||
      value === 'image/webp'
    ) {
      return value;
    }
    return 'image/png';
  };
  if (typeof req.image === 'string') {
    const match = /^data:(.+?);base64,(.+)$/.exec(req.image);
    if (match && match[2]) {
      return [normalize(match[1]), match[2]];
    }
    return [normalize(req.mimeType), req.image];
  }
  return [normalize(req.mimeType), req.image.toString('base64')];
}

function extractText(content: Anthropic.ContentBlockParam[] | Anthropic.ContentBlock[]): string {
  return content
    .map((block) => ('text' in block ? (block.text as string) : ''))
    .join('')
    .trim();
}

export const anthropicProvider: AIProviderDefinition = {
  id: 'anthropic',
  name: 'Anthropic',
  capabilities: ['vision', 'text'],
  defaultModels: { text: DEFAULT_MODEL, vision: DEFAULT_MODEL },
  async validateKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(ANTHROPIC_MODELS_ENDPOINT, {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
  createClient(key: string): ProviderClient {
    return new AnthropicClient(key);
  },
};
