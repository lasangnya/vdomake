import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderError, ProviderRouter } from '@/lib/providers/provider-router';
import { registry } from '@/lib/providers/provider-registry';
import type { AIProviderDefinition, ProviderClient, TaskType } from '@/types/provider';

function fakeProvider(
  id: 'ollama' | 'custom',
  opts: { fail: () => Promise<void> } | null = null,
): AIProviderDefinition {
  const client: ProviderClient = {
    id,
    generateText: vi.fn(async ({ messages }) => {
      if (opts) {
        await opts.fail();
      }
      const last = messages.at(-1);
      return {
        text: `${id}:${last?.content ?? ''}`,
        model: 'fake-model',
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    }),
    analyzeImage: vi.fn(async () => ({
      text: `${id}:vision`,
      model: 'fake-model',
      usage: { inputTokens: 1, outputTokens: 1 },
    })),
  };
  return {
    id,
    name: `Fake ${id}`,
    capabilities: ['text', 'vision'],
    defaultModels: { text: 'fake-model', vision: 'fake-model' },
    validateKey: async () => true,
    createClient: () => client,
  };
}

const ROUTES = [
  {
    taskType: 'storyboard' as TaskType,
    primaryProviderId: 'ollama' as const,
  },
];

const ROUTES_WITH_FALLBACK = [
  {
    taskType: 'storyboard' as TaskType,
    primaryProviderId: 'ollama' as const,
  },
  {
    taskType: 'storyboard' as TaskType,
    primaryProviderId: 'custom' as const,
  },
];

describe('ProviderRouter', () => {
  const originalOllama = registry.get('ollama');
  const originalCustom = registry.get('custom');

  beforeEach(() => {
    registry.set('ollama', fakeProvider('ollama'));
    registry.set('custom', fakeProvider('custom'));
  });

  afterEach(() => {
    registry.set('ollama', originalOllama!);
    registry.set('custom', originalCustom!);
    vi.restoreAllMocks();
  });

  it('routes text generation through the configured provider', async () => {
    const router = new ProviderRouter({ keys: { ollama: 'local' }, routes: ROUTES });
    const result = await router.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
      'storyboard',
    );
    expect(result.result).toContain('ollama:hello');
    expect(result.providerId).toBe('ollama');
  });

  it('throws a ProviderError when no provider has a key', async () => {
    const router = new ProviderRouter({ keys: {}, routes: ROUTES });
    await expect(router.generateText({ messages: [] }, 'storyboard')).rejects.toThrow(
      ProviderError,
    );
    await expect(router.generateText({ messages: [] }, 'storyboard')).rejects.toThrow(
      /No provider configured/,
    );
  });

  it('falls back to the next provider with a key', async () => {
    const failing = fakeProvider('ollama', {
      fail: async () => {
        throw new Error('boom');
      },
    });
    registry.set('ollama', failing);
    const router = new ProviderRouter({
      keys: { ollama: 'local', custom: 'local2' },
      routes: ROUTES_WITH_FALLBACK,
    });
    const result = await router.generateText(
      { messages: [{ role: 'user', content: 'hi' }] },
      'storyboard',
    );
    expect(result.providerId).toBe('custom');
    expect(result.result).toContain('custom:hi');
  });

  it('rethrows the last error when every provider fails', async () => {
    registry.set(
      'ollama',
      fakeProvider('ollama', {
        fail: async () => {
          throw new Error('down');
        },
      }),
    );
    registry.set(
      'custom',
      fakeProvider('custom', {
        fail: async () => {
          throw new Error('down2');
        },
      }),
    );
    const router = new ProviderRouter({
      keys: { ollama: 'k', custom: 'k2' },
      routes: ROUTES_WITH_FALLBACK,
    });
    await expect(router.generateText({ messages: [] }, 'storyboard')).rejects.toThrow(/down2/);
  });

  it('retries on rate limits before failing', async () => {
    const calls = vi.fn(async () => {
      throw Object.assign(new Error('429 rate limited'), { status: 429 });
    });
    const flaky: AIProviderDefinition = {
      id: 'ollama',
      name: 'Flaky',
      capabilities: ['text'],
      defaultModels: { text: 'm', vision: 'm' },
      validateKey: async () => true,
      createClient: () => ({
        id: 'ollama',
        generateText: calls,
        analyzeImage: async () => {
          throw new Error('no');
        },
      }),
    };
    registry.set('ollama', flaky);
    const router = new ProviderRouter({
      keys: { ollama: 'k' },
      routes: ROUTES,
      maxRetries: 3,
    });
    await expect(router.generateText({ messages: [] }, 'storyboard')).rejects.toThrow(
      /rate limited/,
    );
    expect(calls).toHaveBeenCalledTimes(3);
  });

  it('skips providers that lack the required capability', async () => {
    const noVision: AIProviderDefinition = {
      id: 'ollama',
      name: 'NoVision',
      capabilities: ['text'],
      defaultModels: { text: 'm', vision: 'm' },
      validateKey: async () => true,
      createClient: () => ({
        id: 'ollama',
        generateText: async () => ({
          text: '',
          model: 'm',
          usage: { inputTokens: 0, outputTokens: 0 },
        }),
        analyzeImage: async () => {
          throw new Error('should not be called');
        },
      }),
    };
    registry.set('ollama', noVision);
    const router = new ProviderRouter({ keys: { ollama: 'k' }, routes: ROUTES });
    await expect(
      router.analyzeImage({ image: Buffer.from('x'), prompt: 'p' }, 'storyboard'),
    ).rejects.toThrow(/cannot handle task/);
  });

  it('routes transcription through a provider that supports it', async () => {
    const transcribing: AIProviderDefinition = {
      id: 'custom',
      name: 'Transcriber',
      capabilities: ['transcription'],
      defaultModels: { text: 'm', vision: 'm', transcription: 'whisper' },
      validateKey: async () => true,
      createClient: () => ({
        id: 'custom',
        generateText: async () => ({
          text: '',
          model: 'm',
          usage: { inputTokens: 0, outputTokens: 0 },
        }),
        analyzeImage: async () => {
          throw new Error('no');
        },
        transcribe: async () => ({
          text: 'hello world',
          language: 'en',
          duration: 1.5,
          segments: [
            {
              id: 0,
              text: 'hello world',
              start: 0,
              end: 1.5,
              words: [
                { word: 'hello', start: 0, end: 0.6 },
                { word: 'world', start: 0.7, end: 1.5 },
              ],
            },
          ],
        }),
      }),
    };
    registry.set('custom', transcribing);
    const ROUTES_T = [
      { taskType: 'transcription' as TaskType, primaryProviderId: 'custom' as const },
    ];
    const router = new ProviderRouter({ keys: { custom: 'k' }, routes: ROUTES_T });
    const result = await router.transcribe({ audio: Buffer.from('x'), filename: 'a.mp3' });
    expect(result.providerId).toBe('custom');
    expect(result.result.text).toBe('hello world');
    expect(result.result.segments[0].words).toHaveLength(2);
  });
});
