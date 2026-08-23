import type { Scene, TextOverlay } from '@/types/scene';

export interface RenderSceneSpec {
  /** Absolute path to the source screenshot. */
  imagePath: string;
  /** Scene duration in seconds (from keyframes when available). */
  duration: number;
  transitionDuration: number;
  camera: Scene['camera'];
  overlays: TextOverlay[];
}

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
}

export interface SceneClipConfig {
  inputIndex: number;
  /** Frame count for the clip = duration * fps. */
  frames: number;
  /** The zoompan filter expression (without filter name). */
  zoompanExpr: string;
}

export interface XfadeChain {
  /** xfade filtergraph string with stream labels. */
  filtergraph: string;
  /** Offset (seconds) where each xfade starts. */
  offsets: number[];
  /** Total output duration in seconds. */
  duration: number;
}

/**
 * Builds the per-scene zoompan (Ken Burns / camera) expression for ffmpeg.
 * Pure and deterministic.
 */
export function buildZoompan(
  camera: Scene['camera'],
  frames: number,
  options: RenderOptions,
): string {
  const { width, height } = options;
  const x = 'iw/2-(iw/zoom/2)';
  const y = 'ih/2-(ih/zoom/2)';
  switch (camera.type) {
    case 'pan': {
      return `z='zoom+0.001':x='(iw-iw/zoom)*(on/${frames})':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
    }
    case 'zoom-to': {
      const target = Math.max(1.01, Math.min(camera.target?.scale ?? 1.2, 1.5)).toFixed(3);
      return `z='min(1+${((Number(target) - 1) / frames).toFixed(6)}*on,${target})':x=${x}:y=${y}:d=${frames}:s=${width}x${height}`;
    }
    case 'ken-burns': {
      return `z='min(1+${(0.08 / frames).toFixed(6)}*on,1.08)':x=${x}:y=${y}:d=${frames}:s=${width}x${height}`;
    }
    default: {
      return `z='1':x=${x}:y=${y}:d=${frames}:s=${width}x${height}`;
    }
  }
}

/** Builds the filter expression + inputs for a single scene clip. */
export function buildSceneClip(
  spec: RenderSceneSpec,
  options: RenderOptions,
  inputIndex: number,
): SceneClipConfig {
  const frames = Math.max(1, Math.round(spec.duration * options.fps));
  return {
    inputIndex,
    frames,
    zoompanExpr: buildZoompan(spec.camera, frames, options),
  };
}

/**
 * Builds the xfade chain that stitches scene clips together. Offsets are
 * computed so each crossfade overlaps the end of the previous clip.
 */
export function buildXfadeChain(
  durations: number[],
  transitionDurations: number[],
  transition = 'fade',
): XfadeChain {
  const clips = durations.length;
  if (clips === 0) {
    return { filtergraph: '', offsets: [], duration: 0 };
  }
  if (clips === 1) {
    return { filtergraph: '[0:v]null[vout]', offsets: [], duration: durations[0] ?? 0 };
  }

  const td = transitionDurations[0] ?? 0.5;
  const offsets: number[] = [];
  const cum: number[] = [];
  let acc = 0;
  for (const d of durations) {
    acc += d;
    cum.push(acc);
  }
  for (let i = 1; i < clips; i += 1) {
    offsets.push(Math.max(0, cum[i - 1] - i * td));
  }

  const chain: string[] = [];
  let label = '[0:v]';
  for (let i = 1; i < clips; i += 1) {
    const out = i === clips - 1 ? '[vout]' : `[x${i}]`;
    chain.push(
      `${label}[${i}:v]xfade=transition=${transition}:duration=${td.toFixed(2)}:offset=${offsets[i - 1].toFixed(2)}${out}`,
    );
    label = i === clips - 1 ? '' : `[x${i}]`;
  }

  const totalDuration = acc - (clips - 1) * td;
  return { filtergraph: chain.join(';'), offsets, duration: totalDuration };
}
