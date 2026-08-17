import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import type {
  AIProviderDefinition,
  ProviderClient,
  TextGenerationRequest,
  TextGenerationResult,
  VisionRequest,
} from '@/types/provider';

const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_VISION_MODEL = 'gemini-2.5-pro';

export class GeminiClient implements ProviderClient {
  readonly id = 'gemini' as const;
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResult> {
    const model = this.client.getGenerativeModel(
      { model: req.model ?? DEFAULT_TEXT_MODEL },
      { apiVersion: 'v1beta' },
    );
    const contents: Content[] = [
      {
        role: 'user',
        parts: req.messages.map((message) => ({ text: message.content })),
      },
    ];
    const response = await model.generateContent({ contents });
    const result = response.response;
    return {
      text: result.text(),
      model: req.model ?? DEFAULT_TEXT_MODEL,
      usage: {
        inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async analyzeImage(req: VisionRequest): Promise<TextGenerationResult> {
    const model = this.client.getGenerativeModel(
      { model: req.model ?? DEFAULT_VISION_MODEL },
      { apiVersion: 'v1beta' },
    );
    const [mimeType, b64] = imageParts(req);
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: req.prompt }, { inlineData: { mimeType, data: b64 } }],
        },
      ],
    });
    const result = response.response;
    return {
      text: result.text(),
      model: req.model ?? DEFAULT_VISION_MODEL,
      usage: {
        inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}

function imageParts(req: VisionRequest): [string, string] {
  if (typeof req.image === 'string') {
    const match = /^data:(.+?);base64,(.+)$/.exec(req.image);
    if (match) {
      return [match[1], match[2]];
    }
    return [req.mimeType ?? 'image/png', req.image];
  }
  return [req.mimeType ?? 'image/png', req.image.toString('base64')];
}

export const geminiProvider: AIProviderDefinition = {
  id: 'gemini',
  name: 'Google Gemini',
  capabilities: ['vision', 'text'],
  defaultModels: { text: DEFAULT_TEXT_MODEL, vision: DEFAULT_VISION_MODEL },
  async validateKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(GEMINI_MODELS_ENDPOINT, {
        headers: { 'x-goog-api-key': key },
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
  createClient(key: string): ProviderClient {
    return new GeminiClient(key);
  },
};
