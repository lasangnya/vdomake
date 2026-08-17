import type { AIProviderDefinition, ProviderCapability, ProviderId } from '@/types/provider';
import { anthropicProvider } from './clients/anthropic-client';
import { geminiProvider } from './clients/gemini-client';
import { openaiProvider } from './clients/openai-client';
import { customProvider, ollamaProvider } from './clients/ollama-client';

const registry = new Map<ProviderId, AIProviderDefinition>([
  [openaiProvider.id, openaiProvider],
  [anthropicProvider.id, anthropicProvider],
  [geminiProvider.id, geminiProvider],
  [ollamaProvider.id, ollamaProvider],
  [customProvider.id, customProvider],
]);

export function getProvider(id: ProviderId): AIProviderDefinition {
  const provider = registry.get(id);
  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return provider;
}

export function getProvidersForCapability(cap: ProviderCapability): AIProviderDefinition[] {
  return [...registry.values()].filter((provider) => provider.capabilities.includes(cap));
}

export function getAllProviders(): AIProviderDefinition[] {
  return [...registry.values()];
}

export function providerExists(id: string): id is ProviderId {
  return registry.has(id as ProviderId);
}

export { registry }; // exposed for tests and the encrypter layer
