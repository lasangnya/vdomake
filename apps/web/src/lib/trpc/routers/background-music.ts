import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { backgroundMusic } from '@/lib/db/schema';
import { publicProcedure } from '../context';

export const backgroundMusicRouter = {
  get: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(backgroundMusic)
        .where(eq(backgroundMusic.projectId, input.projectId))
        .limit(1);
      return rows[0] ?? null;
    }),

  saveSettings: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        volume: z.number().min(0).max(1),
        fadeInDuration: z.number().min(0).max(30),
        fadeOutDuration: z.number().min(0).max(30),
        loop: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db
        .select({ id: backgroundMusic.id })
        .from(backgroundMusic)
        .where(eq(backgroundMusic.projectId, input.projectId))
        .limit(1);
      if (existing.length === 0) return null;
      const updated = await db
        .update(backgroundMusic)
        .set({
          volume: input.volume,
          fadeInDuration: input.fadeInDuration,
          fadeOutDuration: input.fadeOutDuration,
          loop: input.loop,
        })
        .where(eq(backgroundMusic.id, existing[0].id))
        .returning();
      return updated[0] ?? null;
    }),

  remove: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(backgroundMusic).where(eq(backgroundMusic.projectId, input.projectId));
      return { removed: true };
    }),
};
