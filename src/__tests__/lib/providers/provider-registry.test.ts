import { describe, expect, it } from 'vitest';
import {
  getAllProviders,
  getProvider,
  getProvidersForCapability,
} from '@/lib/providers/provider-registry';

describe('provider-registry', () => {
  it('registers all expected providers', () => {
    const ids = getAllProviders().map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(['openai', 'anthropic', 'gemini', 'ollama', 'custom']),
    );
  });

  it('returns a provider by id', () => {
    expect(getProvider('openai').name).toBe('OpenAI');
    expect(getProvider('gemini').capabilities).toContain('vision');
  });

  it('throws for unknown providers', () => {
    // @ts-expect-error intentionally invalid id
    expect(() => getProvider('nope')).toThrow(/Unknown provider/);
  });

  it('lists providers by capability', () => {
    const vision = getProvidersForCapability('vision');
    expect(vision.map((p) => p.id)).toContain('anthropic');
    expect(vision.map((p) => p.id)).toContain('gemini');

    const transcription = getProvidersForCapability('transcription');
    expect(transcription.map((p) => p.id)).toEqual(['openai']);
  });

  it('every provider ships default models', () => {
    for (const provider of getAllProviders()) {
      expect(provider.defaultModels.text).toBeTruthy();
      expect(provider.defaultModels.vision).toBeTruthy();
    }
  });
});
