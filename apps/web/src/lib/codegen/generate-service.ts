import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { audioTracks, captures, projects, storyboards } from '@/lib/db/schema';
import { generateProjectFiles, type GeneratedProject } from '@/lib/codegen/project-generator';
import { resolveUploadPath, UPLOADS_ROOT } from '@/lib/utils/uploads-path';
import { screenshotToDiskPath } from '@/lib/ai/contact-sheet';
import type { Scene } from '@/types/scene';
import type { ThemeManifest } from '@/types/theme';

/** Root directory where generated Motion Canvas projects live. */
export const MOTION_CANVAS_ROOT = path.join(process.cwd(), 'motion-canvas');

export function projectDir(projectId: string): string {
  return path.join(MOTION_CANVAS_ROOT, projectId);
}

export interface GeneratedCodeResult {
  projectId: string;
  fileCount: number;
  assetCount: number;
  files: string[];
  audioAssetPath: string | null;
}

/**
 * Loads a project's storyboard + captures + audio and generates the Motion
 * Canvas project files on disk (under motion-canvas/{projectId}/).
 */
export async function generateProjectCode(projectId: string): Promise<GeneratedCodeResult> {
  const [projectRows, storyboardRows, captureRows, audioRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
    db.select().from(storyboards).where(eq(storyboards.projectId, projectId)).limit(1),
    db.select().from(captures).where(eq(captures.projectId, projectId)).orderBy(captures.order),
    db.select().from(audioTracks).where(eq(audioTracks.projectId, projectId)).limit(1),
  ]);

  const project = projectRows[0];
  const storyboard = storyboardRows[0];
  if (!project || !storyboard) {
    throw new Error('Project needs a storyboard before generating code');
  }

  const scenes = storyboard.scenes as unknown as Scene[];
  const theme = project.themeManifest as unknown as ThemeManifest | null;

  const screenshotSources: string[] = [];
  for (const scene of scenes) {
    const capture = captureRows.find((c) => c.id === scene.screenshotId);
    const source =
      capture?.screenshotUrl != null
        ? screenshotToDiskPath(capture.screenshotUrl, UPLOADS_ROOT)
        : null;
    if (source) screenshotSources.push(source);
  }
  // Fall back to the first N captures if scene screenshotId doesn't map.
  while (
    screenshotSources.length < scenes.length &&
    screenshotSources.length < captureRows.length
  ) {
    screenshotSources.push(
      screenshotToDiskPath(captureRows[screenshotSources.length].screenshotUrl, UPLOADS_ROOT) ?? '',
    );
  }

  const audioSourcePath = audioRows[0]
    ? screenshotToDiskPath(audioRows[0].fileUrl, UPLOADS_ROOT)
    : null;

  const generated: GeneratedProject = generateProjectFiles({
    projectId,
    scenes,
    theme,
    screenshotSourcePaths: screenshotSources.filter(Boolean),
    audioSourcePath,
    keyframes: [],
  });

  // Write files + copy assets into the project directory.
  const dir = projectDir(projectId);
  const publicAssets = path.join(dir, 'public', 'assets');
  await fs.mkdir(publicAssets, { recursive: true });

  for (const [relativePath, content] of Object.entries(generated.files)) {
    const target = path.join(dir, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }

  for (let i = 0; i < generated.assets.length; i += 1) {
    const source = generated.assets[i];
    if (!source) continue;
    void fs.copyFile(source, path.join(publicAssets, `scene-${i}.png`)).catch(() => undefined);
  }
  if (generated.audioAssetPath && audioSourcePath) {
    await fs
      .copyFile(audioSourcePath, path.join(publicAssets, 'voiceover.mp3'))
      .catch(() => undefined);
  }

  return {
    projectId,
    fileCount: Object.keys(generated.files).length,
    assetCount: generated.assets.filter(Boolean).length,
    files: Object.keys(generated.files),
    audioAssetPath: generated.audioAssetPath,
  };
}

/** Reads the generated project files back (for the code preview). */
export async function readGeneratedCode(projectId: string): Promise<Record<string, string>> {
  const dir = projectDir(projectId);
  const files: Record<string, string> = {};
  for (const relative of ['vite.config.ts', 'tsconfig.json', 'package.json', 'src/project.ts']) {
    const content = await fs.readFile(path.join(dir, relative), 'utf8').catch(() => null);
    if (content !== null) files[relative] = content;
  }
  // Scene files.
  const scenesDir = path.join(dir, 'src', 'scenes');
  const sceneFiles = await fs.readdir(scenesDir).catch(() => [] as string[]);
  for (const file of sceneFiles.filter((f) => f.endsWith('.tsx')).sort()) {
    const content = await fs.readFile(path.join(scenesDir, file), 'utf8').catch(() => null);
    if (content !== null) files[`src/scenes/${file}`] = content;
  }
  return files;
}

export function exportsDir(projectId: string): string {
  return resolveUploadPath(path.join('exports', projectId));
}

export function previewFileUrl(projectId: string): string {
  return `/api/files/exports/${projectId}/preview.mp4`;
}
