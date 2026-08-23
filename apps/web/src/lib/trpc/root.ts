import { t, publicProcedure } from './context';
import { projectRouter } from './routers/projects';
import { providerRouter } from './routers/providers';
import { storyboardRouter } from './routers/storyboards';

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  project: projectRouter,
  provider: providerRouter,
  storyboard: storyboardRouter,
});

export type AppRouter = typeof appRouter;
