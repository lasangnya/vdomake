'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/shared/top-nav';
import { ProviderSettingsForm, type UsageLogEntry } from '@/components/settings';
import { useProviderStore } from '@/stores/provider-store';
import { trpc } from '@/lib/trpc/client';
import type { ProviderId, TaskRoutingConfig, TaskType } from '@/types/provider';

interface ProviderRow {
  providerId: ProviderId;
  keyHint: string | null;
  isValid: boolean | null;
  lastValidatedAt: string | null;
}

export default function SettingsPage() {
  const { setProviderStatus } = useProviderStore();
  const [usage] = useState<UsageLogEntry[]>([]);

  const listQuery = trpc.provider.list.useQuery();
  const saveKeyMutation = trpc.provider.saveKey.useMutation();
  const routingUpdateMutation = trpc.provider.routingUpdate.useMutation();

  useEffect(() => {
    for (const row of listQuery.data ?? []) {
      const providerId = row.providerId as ProviderId;
      setProviderStatus({
        providerId,
        status: row.isValid === true ? 'connected' : 'invalid',
        keyHint: row.keyHint,
        lastValidatedAt: row.lastValidatedAt,
      });
    }
  }, [listQuery.data, setProviderStatus]);

  const records = (listQuery.data ?? []).reduce<Partial<Record<ProviderId, ProviderRow>>>(
    (acc, row) => {
      acc[row.providerId as ProviderId] = row as ProviderRow;
      return acc;
    },
    {},
  );

  const saveKey = async (providerId: ProviderId, key: string) => {
    const saved = await saveKeyMutation.mutateAsync({ providerId, apiKey: key });
    setProviderStatus({
      providerId,
      status: 'connected',
      keyHint: saved.keyHint,
      lastValidatedAt: new Date().toISOString(),
    });
    void listQuery.refetch();
  };

  const saveRouting = async (routing: Record<TaskType, TaskRoutingConfig>) => {
    await routingUpdateMutation.mutateAsync(Object.values(routing));
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage AI providers, task routing, and usage. Your keys are encrypted at rest and never
            shared.
          </p>
        </div>
        <ProviderSettingsForm
          records={records}
          usageLogs={usage}
          onSaveKey={saveKey}
          onSaveRouting={saveRouting}
        />
      </main>
    </div>
  );
}
