export interface MusicSettings {
  volume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  loop: boolean;
  duration: number;
}

export interface DuckSegment {
  start: number;
  end: number;
}

/**
 * Computes the time ranges where the background music should be ducked —
 * wherever the voiceover is audible, with a small padding around it. Pure.
 */
export function computeDuckSegments(
  voiceoverSegments: Array<{ start: number; end: number }>,
  paddingMs = 200,
): DuckSegment[] {
  const padding = paddingMs / 1000;
  return voiceoverSegments.map((segment) => ({
    start: Math.max(0, segment.start - padding),
    end: segment.end + padding,
  }));
}

function duckFilter(segments: DuckSegment[], duckTo: number): string {
  return segments
    .map((segment) => {
      const expression = `between(t,${segment.start.toFixed(2)},${segment.end.toFixed(2)})`;
      return `volume=${duckTo.toFixed(2)}:enable='${expression}'`;
    })
    .join(',');
}

/**
 * Builds the ffmpeg audio filter chain for the background music stream:
 * base volume, fade in/out, and volume ducking during the voiceover. Pure
 * string output.
 */
export function buildMusicFilter(settings: MusicSettings, duckSegments: DuckSegment[]): string {
  const baseVolume = `volume=${settings.volume.toFixed(2)}`;
  const fades: string[] = [];
  if (settings.fadeInDuration > 0) {
    fades.push(`afade=t=in:st=0:d=${settings.fadeInDuration.toFixed(2)}`);
  }
  if (settings.fadeOutDuration > 0 && settings.duration > settings.fadeOutDuration) {
    fades.push(
      `afade=t=out:st=${(settings.duration - settings.fadeOutDuration).toFixed(2)}:d=${settings.fadeOutDuration.toFixed(2)}`,
    );
  }
  const duck = duckSegments.length > 0 ? duckFilter(duckSegments, 0.25) : '';
  return [baseVolume, ...fades, duck].filter(Boolean).join(',');
}

export interface MixedAudioConfig {
  voiceoverFilter: string;
  musicFilter: string;
  /** Input streams: voiceover = [1], music = [2]. */
  mix: string;
}

/**
 * Generates the ffmpeg audio mix config for the export: voiceover delayed to
 * its offset, background music volume/fade/ducked, mixed together. Pure.
 */
export function buildAudioMix(
  voiceoverDelayMs: number,
  musicSettings: MusicSettings | null,
  duckSegments: DuckSegment[],
): MixedAudioConfig {
  const voiceoverFilter = `[1:a]adelay=${voiceoverDelayMs}|${voiceoverDelayMs}[vo]`;
  if (!musicSettings) {
    return { voiceoverFilter, musicFilter: '', mix: '[vo]amix=inputs=1:duration=first[aout]' };
  }
  const musicFilter = `[2:a]${buildMusicFilter(musicSettings, duckSegments)}[mus]`;
  return {
    voiceoverFilter,
    musicFilter,
    mix: '[vo][mus]amix=inputs=2:duration=first:dropout_transition=2[aout]',
  };
}
