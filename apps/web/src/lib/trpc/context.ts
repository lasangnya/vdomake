import { initTRPC } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { providerKeys, taskRouting } from '@/lib/db/schema';
import { keyManager } from '@/lib/providers/key-manager';
import { ProviderRouter } from '@/lib/providers/provider-router';
import type { ProviderId, TaskRoutingConfig } from '@/types/provider';

export interface TRPCContext {
  db: typeof db;
  requestId: string;
  router: () => Promise<ProviderRouter>;
}

export async function buildRouter(): Promise<ProviderRouter> {
  const [keys, routingRows] = await Promise.all([
    db.select().from(providerKeys),
    db.select().from(taskRouting),
  ]);
  const providerKeysMap: Partial<Record<ProviderId, string>> = {};
  for (const row of keys) {
    try {
      providerKeysMap[row.providerId as ProviderId] = keyManager.decrypt(row.encryptedKey);
    } catch {
      // Skip keys that fail to decrypt (e.g. before ENCRYPTION_SECRET was set).
    }
  }
  const routes = routingRows.map(
    (r): TaskRoutingConfig => ({
      taskType: r.taskType as TaskRoutingConfig['taskType'],
      primaryProviderId: r.primaryProviderId as ProviderId,
      primaryModel: r.primaryModel ?? undefined,
      fallbackProviderId: (r.fallbackProviderId as ProviderId | null) ?? null,
      fallbackModel: r.fallbackModel ?? null,
    }),
  );
  return new ProviderRouter({ keys: providerKeysMap, routes });
}

export function createTRPCContext(): TRPCContext {
  return {
    db,
    requestId: randomUUID(),
    router: buildRouter,
  };
}

export const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error, ctx }) {
    const cause = error.cause as { code?: string } | undefined;
    return {
      ...shape,
      data: {
        ...shape.data,
        requestId: ctx?.requestId,
        reason: cause?.code,
      },
    };
  },
});

export const publicProcedure = t.procedure;
