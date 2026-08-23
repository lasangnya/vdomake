import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  audioTracks,
  backgroundMusic,
  captures,
  keyframes,
  projects,
  storyboards,
} from '@/lib/db/schema';
import { renderVideo, type RenderResult, type RenderStage } from './render-engine';
import { exportsDir } from '@/lib/codegen/generate-service';
import { UPLOADS_ROOT } from '@/lib/utils/uploads-path';
import { screenshotToDiskPath } from '@/lib/ai/contact-sheet';
import { computeAudioOffset } from '@/lib/codegen/audio-integrator';
import { computeDuckSegments } from '@/lib/audio/music-mixer';
import type { Scene } from '@/types/scene';
import type { Keyframe } from '@/types/keyframe';

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
}

/**
 * Loads a project's scenes + keyframes + audio and renders the preview video
 * into uploads/exports/{projectId}/. Used by the render worker.
 */
export async function renderProject(
  projectId: string,
  options?: RenderOptions,
  onProgress?: (stage: RenderStage, current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<RenderResult> {
  const [storyboardRows, keyframeRows, captureRows, projectRows, audioRows, musicRows] =
    await Promise.all([
      db.select().from(storyboards).where(eq(storyboards.projectId, projectId)).limit(1),
      db.select().from(keyframes).where(eq(keyframes.projectId, projectId)),
      db.select().from(captures).where(eq(captures.projectId, projectId)).orderBy(captures.order),
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select().from(audioTracks).where(eq(audioTracks.projectId, projectId)).limit(1),
      db.select().from(backgroundMusic).where(eq(backgroundMusic.projectId, projectId)).limit(1),
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

  const voiceoverPath = audioRows[0]?.fileUrl
    ? screenshotToDiskPath(audioRows[0].fileUrl, UPLOADS_ROOT)
    : null;
  const voiceoverOffsetMs = Math.round(computeAudioOffset([...keyframeByScene.values()]) * 1000);

  const music = musicRows[0];
  const musicPath = music?.fileUrl ? screenshotToDiskPath(music.fileUrl, UPLOADS_ROOT) : null;
  const duckSegments = audioRows[0]
    ? computeDuckSegments(
        (audioRows[0].transcript as { segments: Array<{ start: number; end: number }> }).segments,
      )
    : [];

  const renderOptions = options ?? { width: 1920, height: 1080, fps: 30 };
  return renderVideo(
    specs,
    renderOptions,
    exportsDir(projectId),
    {
      voiceoverPath,
      voiceoverOffsetMs,
      musicPath,
      musicSettings: music
        ? {
            volume: music.volume,
            fadeInDuration: music.fadeInDuration,
            fadeOutDuration: music.fadeOutDuration,
            loop: music.loop,
            duration: music.duration,
          }
        : null,
      duckSegments,
    },
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
