import { t, publicProcedure } from './context';
import { projectRouter } from './routers/projects';
import { providerRouter } from './routers/providers';

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  project: projectRouter,
  provider: providerRouter,
});

export type AppRouter = typeof appRouter;
