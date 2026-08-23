import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  buildSceneClip,
  buildXfadeChain,
  type RenderSceneSpec,
  type RenderOptions,
} from './filtergraph';
import { compositeOverlays } from './overlay-compositor';
import { logger } from '@vdomake/logger';

const execFileAsync = promisify(execFile);

export type RenderStage = 'rendering_frames' | 'encoding' | 'complete';

export interface RenderResult {
  outputPath: string;
  duration: number;
  frameCount: number;
}

/**
 * Renders the timed storyboard to an MP4: per-scene clips (zoompan + text
 * overlays) → xfade crossfades → voiceover mux. Uses the system FFmpeg.
 */
export async function renderVideo(
  scenes: RenderSceneSpec[],
  options: RenderOptions,
  outputDir: string,
  voiceoverPath?: string | null,
  audioOffsetMs = 0,
  onProgress?: (stage: RenderStage, current: number, total: number) => void,
): Promise<RenderResult> {
  await mkdir(outputDir, { recursive: true });
  const fps = options.fps;
  const clips: string[] = [];

  onProgress?.('rendering_frames', 0, scenes.length);
  for (let i = 0; i < scenes.length; i += 1) {
    const spec = scenes[i];
    const clip = buildSceneClip(spec, options, i);
    const clipPath = path.join(outputDir, `clip-${i}.mp4`);

    // Composite text overlays onto the frame with sharp (no ffmpeg drawtext).
    const compositedSrc = path.join(outputDir, `src-${i}.png`);
    await compositeOverlays(spec.imagePath, spec.overlays, compositedSrc, options);

    const duration = spec.duration.toFixed(2);
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i',
        compositedSrc,
        '-filter_complex',
        `zoompan=${clip.zoompanExpr}`,
        '-t',
        duration,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-pix_fmt',
        'yuv420p',
        clipPath,
      ],
      { timeout: 120_000 },
    );
    clips.push(clipPath);
    onProgress?.('rendering_frames', i + 1, scenes.length);
  }

  onProgress?.('encoding', 0, 1);
  const silentPath = path.join(outputDir, 'silent.mp4');
  if (clips.length === 1) {
    await execFileAsync('ffmpeg', ['-y', '-i', clips[0], '-c', 'copy', silentPath], {
      timeout: 60_000,
    });
  } else {
    const chain = buildXfadeChain(
      scenes.map((s) => s.duration),
      scenes.map((s) => s.transitionDuration),
    );
    const inputs = clips.flatMap((clip) => ['-i', clip]);
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        ...inputs,
        '-filter_complex',
        chain.filtergraph,
        '-map',
        '[vout]',
        '-t',
        chain.duration.toFixed(2),
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-pix_fmt',
        'yuv420p',
        silentPath,
      ],
      { timeout: 120_000 },
    );
  }

  const outputPath = path.join(outputDir, 'preview.mp4');
  if (voiceoverPath) {
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i',
        silentPath,
        '-i',
        voiceoverPath,
        '-filter_complex',
        `[1:a]adelay=${audioOffsetMs}|${audioOffsetMs}[a]`,
        '-map',
        '0:v',
        '-map',
        '[a]',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-shortest',
        outputPath,
      ],
      { timeout: 60_000 },
    );
  } else {
    await execFileAsync('ffmpeg', ['-y', '-i', silentPath, '-c', 'copy', outputPath], {
      timeout: 60_000,
    });
  }

  onProgress?.('encoding', 1, 1);
  logger.info({ output: outputPath, clips: clips.length }, 'Render complete');

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
  return {
    outputPath,
    duration: totalDuration,
    frameCount: Math.round(totalDuration * fps),
  };
}
