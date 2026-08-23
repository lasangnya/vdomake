import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { generateProjectCode, readGeneratedCode } from '@/lib/codegen/generate-service';
import { reviewGeneratedCode, type CodeReviewItem } from '@/lib/ai/code-reviewer';
import { publicProcedure } from '../context';

export const generateRouter = {
  /** Generates (and persists) the Motion Canvas project for a storyboard. */
  generateCode: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        return await generateProjectCode(input.projectId);
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Code generation failed',
        });
      }
    }),

  /** Reads the generated project files back for the code preview. */
  getCode: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const files = await readGeneratedCode(input.projectId);
      if (Object.keys(files).length === 0) {
        return null;
      }
      return files;
    }),

  /** AI review of the generated scene code. */
  review: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const files = await readGeneratedCode(input.projectId);
      const scenesCode = Object.entries(files)
        .filter(([name]) => name.startsWith('src/scenes/'))
        .map(([name, code]) => ({ index: Number(name.match(/scene-(\d+)/)?.[1] ?? 0), code }))
        .sort((a, b) => a.index - b.index);
      if (scenesCode.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Generate code before reviewing' });
      }

      const providerRouter = await ctx.router();
      const items: CodeReviewItem[] = await reviewGeneratedCode(
        { scenesCode, theme: null },
        {
          generate: async (prompt) => {
            const { result } = await providerRouter.generateText(
              { messages: [{ role: 'user', content: prompt }], maxTokens: 2048 },
              'code_review',
            );
            return result;
          },
        },
      );
      return items;
    }),
};
