import type { Scene } from '@/types/scene';
import type { ThemeManifest } from '@/types/theme';
import type { Keyframe } from '@/types/keyframe';
import { generateProjectAudio } from './audio-integrator';
import { generateSceneCode } from './scene-generator';

export interface GeneratedProject {
  files: Record<string, string>;
  /** Screenshot asset paths that must be copied into `public/assets/`. */
  assets: string[];
  audioAssetPath: string | null;
}

export interface ProjectGenerationInput {
  projectId: string;
  scenes: Scene[];
  theme: ThemeManifest | null;
  /** Absolute file-system paths to the source screenshots, in scene order. */
  screenshotSourcePaths: string[];
  /** Voiceover file path relative to uploads, or null. */
  audioSourcePath?: string | null;
  keyframes?: Keyframe[];
}

const VITE_CONFIG = `import { defineConfig } from 'vite';
import motionCanvas from '@motion-canvas/vite-plugin';

export default defineConfig({
  plugins: [motionCanvas({ project: './src/project.ts' })],
  server: { port: 9000 },
});
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
`;

function packageJson(projectId: string): string {
  return JSON.stringify(
    {
      name: `vdomake-${projectId}`,
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        '@motion-canvas/2d': '^3.17.0',
        '@motion-canvas/core': '^3.17.0',
        '@motion-canvas/vite-plugin': '^3.17.0',
        vite: '^5.4.0',
      },
    },
    null,
    2,
  );
}

function projectFile(sceneCount: number, audioSection: string | null): string {
  const sceneImports = Array.from(
    { length: sceneCount },
    (_, i) => `import scene${i} from './scenes/scene-${i}?scene';`,
  ).join('\n');
  const scenes = `[${Array.from({ length: sceneCount }, (_, i) => `scene${i}`).join(', ')}]`;
  return [
    "import { makeProject } from '@motion-canvas/core';",
    sceneImports,
    '',
    'export default makeProject({',
    `  scenes: ${scenes},`,
    audioSection ?? '  audio: undefined,',
    '});',
    '',
  ].join('\n');
}

/**
 * Generates the complete Motion Canvas project (files keyed by relative path)
 * for a storyboard. Pure string output — file writes + asset copies are the
 * caller's responsibility.
 */
export function generateProjectFiles(input: ProjectGenerationInput): GeneratedProject {
  const files: Record<string, string> = {
    'vite.config.ts': VITE_CONFIG,
    'tsconfig.json': TSCONFIG,
    'package.json': packageJson(input.projectId),
  };

  const audioAssetPath = input.audioSourcePath ? '/assets/voiceover.mp3' : null;
  const audioSection = audioAssetPath
    ? generateProjectAudio({ audioAssetPath, keyframes: input.keyframes ?? [] })
    : null;

  for (let i = 0; i < input.scenes.length; i += 1) {
    const scene = input.scenes[i];
    const assetPath = `/assets/scene-${i}.png`;
    files[`src/scenes/scene-${i}.tsx`] = generateSceneCode({
      scene,
      assetPath,
      theme: input.theme,
    });
  }

  files['src/project.ts'] = projectFile(input.scenes.length, audioSection);

  return {
    files,
    assets: input.screenshotSourcePaths,
    audioAssetPath,
  };
}
