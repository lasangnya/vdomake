import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type {
  AIProviderDefinition,
  ProviderClient,
  TextGenerationRequest,
  TextGenerationResult,
  TranscriptionRequest,
  TranscriptionResult,
  VisionRequest,
} from '@/types/provider';

const OPENAI_MODELS_ENDPOINT = 'https://api.openai.com/v1/models';

export class OpenAIClient implements ProviderClient {
  readonly id = 'openai' as const;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResult> {
    const completion = await this.client.chat.completions.create({
      model: req.model ?? 'gpt-4o-mini',
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
    });
    const text = completion.choices[0]?.message?.content ?? '';
    return {
      text,
      model: completion.model,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  }

  async analyzeImage(req: VisionRequest): Promise<TextGenerationResult> {
    const dataUrl = toDataUrl(req);
    const completion = await this.client.chat.completions.create({
      model: req.model ?? 'gpt-4o',
      max_tokens: req.maxTokens ?? 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
            { type: 'text', text: req.prompt },
          ],
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? '';
    return {
      text,
      model: completion.model,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  }

  async transcribe(req: TranscriptionRequest): Promise<TranscriptionResult> {
    const file = await toFile(req.audio, req.filename ?? 'audio.mp3');
    const result = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: req.language,
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });
    const allWords = (result.words ?? []) as Array<{
      word: string;
      start: number;
      end: number;
    }>;
    return {
      text: result.text,
      language: result.language ?? 'unknown',
      duration: result.duration ?? 0,
      segments: (result.segments ?? []).map((segment) => ({
        id: segment.id,
        text: segment.text,
        start: segment.start,
        end: segment.end,
        words: allWords
          .filter((word) => word.start >= segment.start && word.end <= segment.end)
          .map((word) => ({ word: word.word, start: word.start, end: word.end })),
      })),
    };
  }
}

function toDataUrl(req: VisionRequest): string {
  if (typeof req.image === 'string') {
    // Already a data URL, or a remote URL — pass through unchanged.
    return req.image.startsWith('data:')
      ? req.image
      : `data:${req.mimeType ?? 'image/png'};base64,${req.image}`;
  }
  const mime = req.mimeType ?? 'image/png';
  return `data:${mime};base64,${req.image.toString('base64')}`;
}

export const openaiProvider: AIProviderDefinition = {
  id: 'openai',
  name: 'OpenAI',
  capabilities: ['vision', 'text', 'transcription'],
  defaultModels: { text: 'gpt-4o-mini', vision: 'gpt-4o', transcription: 'whisper-1' },
  async validateKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(OPENAI_MODELS_ENDPOINT, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
  createClient(key: string): ProviderClient {
    return new OpenAIClient(key);
  },
};
