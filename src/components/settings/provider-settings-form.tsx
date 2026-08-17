'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getAllProviders } from '@/lib/providers/provider-registry';
import { useProviderStore } from '@/stores/provider-store';
import type { ProviderId, TaskRoutingConfig, TaskType } from '@/types/provider';
import { ProviderCard } from './provider-card';
import { TaskRoutingTable } from './task-routing-table';
import { UsageDashboard, type UsageLogEntry } from './usage-dashboard';

export function ProviderSettingsForm({
  records,
  usageLogs,
  onSaveKey,
  onSaveRouting,
}: {
  records?: Partial<Record<ProviderId, { keyHint: string | null; isValid: boolean | null } | null>>;
  usageLogs?: UsageLogEntry[];
  onSaveKey?: (providerId: ProviderId, key: string) => Promise<void> | void;
  onSaveRouting?: (routing: Record<TaskType, TaskRoutingConfig>) => Promise<void> | void;
}) {
  const { routing, setRouting } = useProviderStore();
  const [routingDirty, setRoutingDirty] = useState(false);
  const [savingRouting, setSavingRouting] = useState(false);

  const handleRoutingChange = (taskType: TaskType, config: TaskRoutingConfig) => {
    setRouting(taskType, config);
    setRoutingDirty(true);
  };

  const handleSaveRouting = async () => {
    setSavingRouting(true);
    try {
      await onSaveRouting?.(routing);
      setRoutingDirty(false);
    } finally {
      setSavingRouting(false);
    }
  };

  return (
    <Tabs defaultValue="keys" className="w-full">
      <TabsList>
        <TabsTrigger value="keys">API Keys</TabsTrigger>
        <TabsTrigger value="routing">Task Routing</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
      </TabsList>

      <TabsContent value="keys" className="mt-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {getAllProviders().map((provider) => (
            <ProviderCard
              key={provider.id}
              providerId={provider.id}
              record={
                records?.[provider.id]
                  ? {
                      id: provider.id,
                      providerId: provider.id,
                      encryptedKey: '',
                      keyHint: records[provider.id]?.keyHint ?? '',
                      isValid: records[provider.id]?.isValid ?? null,
                      lastValidatedAt: null,
                      createdAt: '',
                      updatedAt: '',
                    }
                  : null
              }
              onSaveKey={(key) => onSaveKey?.(provider.id, key)}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Keys are encrypted at rest (AES-256-GCM) and never leave your server. Provider status is
          refreshed on save.
        </p>
      </TabsContent>

      <TabsContent value="routing" className="mt-6 space-y-4">
        <TaskRoutingTable routing={routing} onRoutingChange={handleRoutingChange} />
        <Separator />
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            If the primary provider fails, the fallback is tried automatically.
          </p>
          <Button
            onClick={handleSaveRouting}
            disabled={!routingDirty || savingRouting}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {savingRouting ? 'Saving…' : 'Save Routing'}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="usage" className="mt-6">
        <UsageDashboard logs={usageLogs} />
      </TabsContent>
    </Tabs>
  );
}
