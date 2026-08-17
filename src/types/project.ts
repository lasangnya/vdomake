import type { ThemeManifest } from './theme';

export type ProjectStatus =
  'draft' | 'capturing' | 'captured' | 'storyboarding' | 'ready' | 'exporting' | 'done';

export interface Project {
  id: string;
  name: string;
  url: string;
  status: ProjectStatus;
  themeManifest: ThemeManifest | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapturedFrame {
  id: string;
  projectId: string;
  screenshotUrl: string;
  scrollPosition: number;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  order: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}
