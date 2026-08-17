export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';

export type ProviderCapability = 'vision' | 'text' | 'transcription' | 'embedding';

export type TaskType = 'vision' | 'storyboard' | 'transcription' | 'auto_sync' | 'code_review';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TextGenerationRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TextGenerationResult {
  text: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface VisionRequest {
  /** Raw image bytes (decoded server-side) or a base64 data URL. */
  image: Buffer | string;
  /** MIME type of the image, e.g. "image/png". Ignored when a data URL is passed. */
  mimeType?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

export interface TranscriptionRequest {
  audio: Buffer;
  filename?: string;
  language?: string;
}

/**
 * Unified client interface implemented by every provider. Every method is
 * optional so capability-limited providers can omit unsupported operations;
 * the router guards calls against the provider's declared capabilities.
 */
export interface ProviderClient {
  readonly id: ProviderId;
  generateText(req: TextGenerationRequest): Promise<TextGenerationResult>;
  analyzeImage(req: VisionRequest): Promise<TextGenerationResult>;
  transcribe?(req: TranscriptionRequest): Promise<TranscriptionResult>;
}

export interface ProviderModels {
  text: string;
  vision: string;
  transcription?: string;
}

export interface AIProviderDefinition {
  id: ProviderId;
  name: string;
  capabilities: ProviderCapability[];
  defaultModels: ProviderModels;
  /** Validates an API key against the provider's API without storing it. */
  validateKey(key: string): Promise<boolean>;
  createClient(key: string): ProviderClient;
}

export interface TaskRoutingConfig {
  taskType: TaskType;
  primaryProviderId: ProviderId;
  primaryModel?: string;
  fallbackProviderId?: ProviderId | null;
  fallbackModel?: string | null;
}

export interface ProviderKeyRecord {
  id: string;
  providerId: ProviderId;
  encryptedKey: string;
  keyHint: string;
  isValid: boolean | null;
  lastValidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
