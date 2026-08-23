import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { captures, projects, storyboards, type StoryboardRow } from '@/lib/db/schema';
import { generateStoryboard } from '@/lib/ai/storyboard-agent';
import { storyboardSaveInputSchema } from '@vdomake/validators';
import { publicProcedure } from '../context';
import { logger } from '@vdomake/logger';
import type { Scene, Storyboard } from '@/types/scene';
import type { ThemeManifest } from '@/types/theme';

function toStoryboard(row: StoryboardRow): Storyboard {
  return {
    id: row.id,
    projectId: row.projectId,
    scenes: row.scenes as unknown as Scene[],
    version: row.version,
    status: row.status as Storyboard['status'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const storyboardRouter = {
  /** Loads the latest storyboard for a project, or null if none exists. */
  get: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(storyboards)
        .where(eq(storyboards.projectId, input.projectId))
        .orderBy(desc(storyboards.updatedAt))
        .limit(1);
      if (rows.length === 0) return null;
      return toStoryboard(rows[0]);
    }),

  /** Generates a storyboard from the project's captures + theme via the vision provider. */
  generate: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projectRows = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      const project = projectRows[0];
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }
      if (!project.themeManifest) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project has no theme manifest — run a capture first',
        });
      }
      const frameRows = await ctx.db
        .select({ id: captures.id, screenshotUrl: captures.screenshotUrl })
        .from(captures)
        .where(eq(captures.projectId, input.projectId))
        .orderBy(captures.order);
      if (frameRows.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project has no captured frames — run a capture first',
        });
      }

      const providerRouter = await ctx.router();
      const storyboard = await generateStoryboard(
        {
          projectId: input.projectId,
          pageTitle: project.name,
          url: project.url,
          frames: frameRows,
          themeManifest: project.themeManifest as unknown as ThemeManifest,
        },
        {
          analyzeVision: async (prompt, image, mimeType) => {
            const { result } = await providerRouter.analyzeImage(
              { image, mimeType, prompt, maxTokens: 4096 },
              'storyboard',
            );
            return result;
          },
        },
      );

      // Persist: replace any previous storyboard for this project.
      await ctx.db.delete(storyboards).where(eq(storyboards.projectId, input.projectId));
      const inserted = await ctx.db
        .insert(storyboards)
        .values({
          projectId: input.projectId,
          scenes: storyboard.scenes as unknown as object,
          version: storyboard.version,
          status: storyboard.status,
        })
        .returning();
      await ctx.db
        .update(projects)
        .set({ status: 'storyboarding', updatedAt: new Date() })
        .where(eq(projects.id, input.projectId));

      logger.info(
        { projectId: input.projectId, scenes: storyboard.scenes.length },
        'Storyboard generated',
      );
      return toStoryboard(inserted[0]);
    }),

  /** Saves (upserts) an edited storyboard. */
  save: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        storyboard: storyboardSaveInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: storyboards.id })
        .from(storyboards)
        .where(eq(storyboards.projectId, input.projectId))
        .orderBy(desc(storyboards.updatedAt))
        .limit(1);

      const values = {
        projectId: input.projectId,
        scenes: input.storyboard.scenes as unknown as object,
        version: input.storyboard.version,
        status: input.storyboard.status,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        const updated = await ctx.db
          .update(storyboards)
          .set(values)
          .where(eq(storyboards.id, existing[0].id))
          .returning();
        return toStoryboard(updated[0]);
      }
      const inserted = await ctx.db.insert(storyboards).values(values).returning();
      return toStoryboard(inserted[0]);
    }),
};
