import { create } from 'zustand';
import type { ProviderId, TaskRoutingConfig, TaskType } from '@/types/provider';

export type ProviderConnectionStatus =
  'connected' | 'invalid' | 'not_configured' | 'rate_limited' | 'validating';

export interface ProviderStatusState {
  providerId: ProviderId;
  status: ProviderConnectionStatus;
  keyHint: string | null;
  lastValidatedAt: string | null;
}

interface ProviderState {
  providers: Record<ProviderId, ProviderStatusState>;
  routing: Record<TaskType, TaskRoutingConfig>;
  setProviderStatus: (status: ProviderStatusState) => void;
  setRouting: (taskType: TaskType, config: TaskRoutingConfig) => void;
  reset: () => void;
}

const defaultRouting: Record<TaskType, TaskRoutingConfig> = {
  vision: { taskType: 'vision', primaryProviderId: 'openai' },
  storyboard: { taskType: 'storyboard', primaryProviderId: 'openai' },
  transcription: { taskType: 'transcription', primaryProviderId: 'openai' },
  auto_sync: { taskType: 'auto_sync', primaryProviderId: 'openai' },
  code_review: { taskType: 'code_review', primaryProviderId: 'openai' },
};

export const useProviderStore = create<ProviderState>((set) => ({
  providers: {
    openai: {
      providerId: 'openai',
      status: 'not_configured',
      keyHint: null,
      lastValidatedAt: null,
    },
    anthropic: {
      providerId: 'anthropic',
      status: 'not_configured',
      keyHint: null,
      lastValidatedAt: null,
    },
    gemini: {
      providerId: 'gemini',
      status: 'not_configured',
      keyHint: null,
      lastValidatedAt: null,
    },
    ollama: {
      providerId: 'ollama',
      status: 'not_configured',
      keyHint: null,
      lastValidatedAt: null,
    },
    custom: {
      providerId: 'custom',
      status: 'not_configured',
      keyHint: null,
      lastValidatedAt: null,
    },
  },
  routing: defaultRouting,
  setProviderStatus: (status) =>
    set((state) => ({
      providers: { ...state.providers, [status.providerId]: status },
    })),
  setRouting: (taskType, config) =>
    set((state) => ({
      routing: { ...state.routing, [taskType]: config },
    })),
  reset: () =>
    set({
      providers: {
        openai: {
          providerId: 'openai',
          status: 'not_configured',
          keyHint: null,
          lastValidatedAt: null,
        },
        anthropic: {
          providerId: 'anthropic',
          status: 'not_configured',
          keyHint: null,
          lastValidatedAt: null,
        },
        gemini: {
          providerId: 'gemini',
          status: 'not_configured',
          keyHint: null,
          lastValidatedAt: null,
        },
        ollama: {
          providerId: 'ollama',
          status: 'not_configured',
          keyHint: null,
          lastValidatedAt: null,
        },
        custom: {
          providerId: 'custom',
          status: 'not_configured',
          keyHint: null,
          lastValidatedAt: null,
        },
      },
      routing: defaultRouting,
    }),
}));
