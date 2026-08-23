import { t, publicProcedure } from './context';
import { projectRouter } from './routers/projects';
import { providerRouter } from './routers/providers';
import { storyboardRouter } from './routers/storyboards';
import { audioRouter } from './routers/audio';
import { generateRouter } from './routers/generate';
import { backgroundMusicRouter } from './routers/background-music';

export const appRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok' as const })),
  project: projectRouter,
  provider: providerRouter,
  storyboard: storyboardRouter,
  audio: audioRouter,
  generate: generateRouter,
  backgroundMusic: backgroundMusicRouter,
});

export type AppRouter = typeof appRouter;
