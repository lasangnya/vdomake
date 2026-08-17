'use client';

import { getAllProviders } from '@/lib/providers/provider-registry';
import type { TaskRoutingConfig, TaskType } from '@/types/provider';
import { ModelSelector, ProviderSelect } from './model-selector';

export const TASK_LABELS: Record<TaskType, string> = {
  vision: 'Vision Analysis',
  storyboard: 'Storyboard Gen',
  transcription: 'Transcription',
  auto_sync: 'Auto-Sync',
  code_review: 'Code Review',
};

const TASK_ORDER: TaskType[] = [
  'vision',
  'storyboard',
  'transcription',
  'auto_sync',
  'code_review',
];

export function TaskRoutingTable({
  routing,
  onRoutingChange,
}: {
  routing: Record<TaskType, TaskRoutingConfig>;
  onRoutingChange: (taskType: TaskType, config: TaskRoutingConfig) => void;
}) {
  const providers = getAllProviders().map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">Primary Provider</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">Fallback Provider</th>
            <th className="px-4 py-3">Fallback Model</th>
          </tr>
        </thead>
        <tbody>
          {TASK_ORDER.map((taskType) => {
            const config = routing[taskType];
            return (
              <tr key={taskType} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2.5 font-medium text-zinc-800">{TASK_LABELS[taskType]}</td>
                <td className="px-4 py-2.5">
                  <ProviderSelect
                    id={`primary-provider-${taskType}`}
                    label={`Primary provider for ${taskType}`}
                    providers={providers}
                    value={config.primaryProviderId}
                    onChange={(primaryProviderId) =>
                      onRoutingChange(taskType, { ...config, primaryProviderId })
                    }
                  />
                </td>
                <td className="px-4 py-2.5">
                  <ModelSelector
                    id={`primary-model-${taskType}`}
                    label={`Primary model for ${taskType}`}
                    models={[]}
                    value={config.primaryModel ?? ''}
                    onChange={(primaryModel) =>
                      onRoutingChange(taskType, { ...config, primaryModel })
                    }
                  />
                </td>
                <td className="px-4 py-2.5">
                  <ProviderSelect
                    id={`fallback-provider-${taskType}`}
                    label={`Fallback provider for ${taskType}`}
                    providers={providers}
                    value={config.fallbackProviderId ?? ''}
                    onChange={(fallbackProviderId) =>
                      onRoutingChange(taskType, { ...config, fallbackProviderId })
                    }
                  />
                </td>
                <td className="px-4 py-2.5">
                  <ModelSelector
                    id={`fallback-model-${taskType}`}
                    label={`Fallback model for ${taskType}`}
                    models={[]}
                    value={config.fallbackModel ?? ''}
                    onChange={(fallbackModel) =>
                      onRoutingChange(taskType, { ...config, fallbackModel })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
