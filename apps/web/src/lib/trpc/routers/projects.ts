import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { captures, projects, type ProjectRow } from '@/lib/db/schema';
import { urlInputSchema } from '@vdomake/validators';
import { publicProcedure } from '../context';

function projectNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Untitled project';
  }
}

export const projectListSchema = z.object({
  includeCaptures: z.boolean().default(false),
});

export const projectRouter = {
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: projects.id,
        name: projects.name,
        url: projects.url,
        status: projects.status,
        themeManifest: projects.themeManifest,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        captureCount: ctx.db.$count(captures, eq(captures.projectId, projects.id)),
      })
      .from(projects)
      .orderBy(desc(projects.updatedAt));
    return rows;
  }),

  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const project = await ctx.db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
    const row = project[0] as ProjectRow | undefined;
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
    }
    const frames = await ctx.db
      .select()
      .from(captures)
      .where(eq(captures.projectId, input.id))
      .orderBy(captures.order);
    return { ...row, captures: frames };
  }),

  create: publicProcedure
    .input(urlInputSchema.pick({ url: true }))
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db
        .insert(projects)
        .values({
          name: projectNameFromUrl(input.url),
          url: input.url,
          status: 'draft',
        })
        .returning();
      return created[0] as ProjectRow;
    }),
};
