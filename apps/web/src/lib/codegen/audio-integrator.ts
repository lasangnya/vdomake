import type { Keyframe } from '@/types/keyframe';

export interface AudioIntegrationInput {
  /** Asset path of the voiceover inside the generated project (e.g. `/assets/voiceover.mp3`). */
  audioAssetPath: string;
  keyframes: Keyframe[];
}

/**
 * Computes the audio offset (seconds) so the narration starts at the first
 * scene's start time. Returns 0 when keyframes are empty.
 */
export function computeAudioOffset(keyframes: Keyframe[]): number {
  if (keyframes.length === 0) return 0;
  const firstStart = Math.min(...keyframes.map((kf) => kf.startTime));
  return Math.max(0, firstStart);
}

/**
 * Generates the `makeProject` settings with audio + offset. Pure string output.
 */
export function generateProjectAudio(input: AudioIntegrationInput): string {
  const offset = computeAudioOffset(input.keyframes);
  return [
    `  audio: ${JSON.stringify(input.audioAssetPath)},`,
    `  audioOffset: ${offset.toFixed(2)},`,
  ].join('\n');
}
