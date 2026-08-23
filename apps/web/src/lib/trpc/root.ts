import { t, publicProcedure } from './context';
import { projectRouter } from './routers/projects';
import { providerRouter } from './routers/providers';
import { storyboardRouter } from './routers/storyboards';
import { audioRouter } from './routers/audio';

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  project: projectRouter,
  provider: providerRouter,
  storyboard: storyboardRouter,
  audio: audioRouter,
});

export type AppRouter = typeof appRouter;
