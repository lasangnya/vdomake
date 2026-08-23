import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { audioTracks, captures, keyframes, projects, storyboards } from '@/lib/db/schema';
import { renderVideo, type RenderResult, type RenderStage } from './render-engine';
import { exportsDir } from '@/lib/codegen/generate-service';
import { UPLOADS_ROOT } from '@/lib/utils/uploads-path';
import { screenshotToDiskPath } from '@/lib/ai/contact-sheet';
import { computeAudioOffset } from '@/lib/codegen/audio-integrator';
import type { Scene } from '@/types/scene';
import type { Keyframe } from '@/types/keyframe';

const RESOLUTION = { width: 1920, height: 1080 };
const FPS = 30;

/**
 * Loads a project's scenes + keyframes + audio and renders the preview video
 * into uploads/exports/{projectId}/. Used by the render worker.
 */
export async function renderProject(
  projectId: string,
  onProgress?: (stage: RenderStage, current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<RenderResult> {
  const [storyboardRows, keyframeRows, captureRows, projectRows] = await Promise.all([
    db.select().from(storyboards).where(eq(storyboards.projectId, projectId)).limit(1),
    db.select().from(keyframes).where(eq(keyframes.projectId, projectId)),
    db.select().from(captures).where(eq(captures.projectId, projectId)).orderBy(captures.order),
    db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
  ]);

  const storyboard = storyboardRows[0];
  const project = projectRows[0];
  if (!storyboard || !project) {
    throw new Error('Project needs a storyboard to render');
  }

  const scenes = storyboard.scenes as unknown as Scene[];
  const keyframeByScene = new Map<string, Keyframe>(keyframeRows.map((kf) => [kf.sceneId, kf]));
  const captureById = new Map(captureRows.map((c) => [c.id, c]));

  const specs = scenes.map((scene) => {
    const keyframe = keyframeByScene.get(scene.id);
    const capture = scene.screenshotId ? captureById.get(scene.screenshotId) : undefined;
    const imagePath = capture?.screenshotUrl
      ? (screenshotToDiskPath(capture.screenshotUrl, UPLOADS_ROOT) ?? '')
      : '';
    return {
      imagePath,
      duration: keyframe ? keyframe.endTime - keyframe.startTime : scene.duration,
      transitionDuration: keyframe?.transitionDuration ?? scene.transition.duration,
      camera: scene.camera,
      overlays: scene.overlays,
    };
  });

  const audioRows = await db
    .select()
    .from(audioTracks)
    .where(eq(audioTracks.projectId, projectId))
    .limit(1);
  const voiceoverPath = audioRows[0]?.fileUrl
    ? screenshotToDiskPath(audioRows[0].fileUrl, UPLOADS_ROOT)
    : null;
  const audioOffsetMs = Math.round(computeAudioOffset([...keyframeByScene.values()]) * 1000);

  return renderVideo(
    specs,
    { ...RESOLUTION, fps: FPS },
    exportsDir(projectId),
    voiceoverPath,
    audioOffsetMs,
    (stage, current, total) => {
      if (signal?.aborted) return;
      onProgress?.(stage, current, total);
    },
  );
}

/** Path of the mp4 preview on disk. */
export function previewPath(projectId: string): string {
  return path.join(exportsDir(projectId), 'preview.mp4');
}
