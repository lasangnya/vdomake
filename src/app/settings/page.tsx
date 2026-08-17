'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/shared/top-nav';
import { ProviderSettingsForm, type UsageLogEntry } from '@/components/settings';
import { useProviderStore } from '@/stores/provider-store';
import type { ProviderId, TaskRoutingConfig, TaskType } from '@/types/provider';
import type { ApiResponse } from '@/types/api';

interface ProviderRow {
  providerId: ProviderId;
  keyHint: string | null;
  isValid: boolean | null;
  lastValidatedAt: string | null;
}

export default function SettingsPage() {
  const { setProviderStatus } = useProviderStore();
  const [records, setRecords] = useState<Partial<Record<ProviderId, ProviderRow>>>({});
  const [usage] = useState<UsageLogEntry[]>([]);

  useEffect(() => {
    void fetch('/api/providers')
      .then((res) => res.json())
      .then((body: ApiResponse<ProviderRow[]>) => {
        if (body.error) return;
        const byId: Partial<Record<ProviderId, ProviderRow>> = {};
        for (const row of body.data) {
          byId[row.providerId] = row;
          setProviderStatus({
            providerId: row.providerId,
            status: row.isValid === true ? 'connected' : 'invalid',
            keyHint: row.keyHint,
            lastValidatedAt: row.lastValidatedAt,
          });
        }
        setRecords(byId);
      })
      .catch(() => undefined);
  }, [setProviderStatus]);

  const saveKey = async (providerId: ProviderId, key: string) => {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, apiKey: key }),
    });
    const body = (await res.json()) as ApiResponse<ProviderRow>;
    if (!res.ok || body.error) {
      throw new Error('Key rejected');
    }
    setProviderStatus({
      providerId,
      status: 'connected',
      keyHint: body.data.keyHint,
      lastValidatedAt: new Date().toISOString(),
    });
    setRecords((prev) => ({ ...prev, [providerId]: body.data }));
  };

  const saveRouting = async (routing: Record<TaskType, TaskRoutingConfig>) => {
    const res = await fetch('/api/providers/routing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.values(routing)),
    });
    if (!res.ok) {
      throw new Error('Failed to save routing');
    }
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
