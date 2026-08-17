import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { providerKeys, taskRouting } from '@/lib/db/schema';
import { keyManager } from '@/lib/providers/key-manager';
import { getProvider, providerExists } from '@/lib/providers/provider-registry';
import { apiKeySchema, taskRoutingListSchema } from '@vdomake/validators';
import { publicProcedure } from '../context';
import { logger } from '@vdomake/logger';

const providerIdSchema = apiKeySchema.shape.providerId;

export const providerRouter = {
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(providerKeys);
    return rows.map((row) => ({
      providerId: row.providerId,
      keyHint: row.keyHint,
      isValid: row.isValid,
      lastValidatedAt: row.lastValidatedAt,
    }));
  }),

  saveKey: publicProcedure.input(apiKeySchema).mutation(async ({ ctx, input }) => {
    const provider = getProvider(input.providerId);
    const isValid = await provider.validateKey(input.apiKey);
    if (!isValid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: `Invalid API key for ${provider.name}`,
      });
    }
    const encrypted = keyManager.encrypt(input.apiKey);
    const existing = await ctx.db
      .select({ id: providerKeys.id })
      .from(providerKeys)
      .where(eq(providerKeys.providerId, input.providerId))
      .limit(1);

    if (existing.length > 0) {
      await ctx.db
        .update(providerKeys)
        .set({
          encryptedKey: encrypted,
          keyHint: keyManager.hint(input.apiKey),
          isValid: true,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(providerKeys.id, existing[0].id));
    } else {
      await ctx.db.insert(providerKeys).values({
        providerId: input.providerId,
        encryptedKey: encrypted,
        keyHint: keyManager.hint(input.apiKey),
        isValid: true,
        lastValidatedAt: new Date(),
      });
    }
    logger.info({ providerId: input.providerId }, 'Provider key saved');
    return { providerId: input.providerId, keyHint: keyManager.hint(input.apiKey), isValid: true };
  }),

  deleteKey: publicProcedure
    .input(z.object({ providerId: providerIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(providerKeys).where(eq(providerKeys.providerId, input.providerId));
      return { deleted: input.providerId };
    }),

  routingList: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(taskRouting);
  }),

  routingUpdate: publicProcedure.input(taskRoutingListSchema).mutation(async ({ ctx, input }) => {
    for (const route of input) {
      if (!providerExists(route.primaryProviderId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown provider: ${route.primaryProviderId}` });
      }
      if (route.fallbackProviderId && !providerExists(route.fallbackProviderId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown provider: ${route.fallbackProviderId}` });
      }
      const existing = await ctx.db
        .select({ id: taskRouting.id })
        .from(taskRouting)
        .where(eq(taskRouting.taskType, route.taskType))
        .limit(1);
      const values = {
        primaryProviderId: route.primaryProviderId,
        primaryModel: route.primaryModel ?? null,
        fallbackProviderId: route.fallbackProviderId ?? null,
        fallbackModel: route.fallbackModel ?? null,
        updatedAt: new Date(),
      };
      if (existing.length > 0) {
        await ctx.db.update(taskRouting).set(values).where(eq(taskRouting.id, existing[0].id));
      } else {
        await ctx.db.insert(taskRouting).values({ taskType: route.taskType, ...values });
      }
    }
    return ctx.db.select().from(taskRouting);
  }),
};
