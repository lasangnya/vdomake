import type { TranscriptionResult } from '@/types/provider';

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'] as const;
export const ALLOWED_AUDIO_MIME_PREFIX = 'audio/';
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB

export interface AudioFileInfo {
  name: string;
  extension: string;
  size: number;
}

/** Validates an uploaded audio file by extension and size. Returns the reason on failure. */
export function validateAudioFile(
  file: File,
): { ok: true; info: AudioFileInfo } | { ok: false; reason: string } {
  const name = file.name.toLowerCase();
  const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(extension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number])) {
    return {
      ok: false,
      reason: `Unsupported file type "${extension || 'unknown'}". Use MP3, WAV, M4A, OGG or WebM.`,
    };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, reason: 'File is too large (max 50 MB).' };
  }
  return { ok: true, info: { name, extension, size: file.size } };
}

export interface TranscriptionDeps {
  transcribe: (audio: Buffer, filename: string) => Promise<TranscriptionResult>;
}

/** Loads the transcription result for an audio buffer via the provided callable. */
export async function transcribeAudio(
  audio: Buffer,
  filename: string,
  deps: TranscriptionDeps,
): Promise<TranscriptionResult> {
  const result = await deps.transcribe(audio, filename);
  return {
    text: result.text,
    language: result.language,
    duration: result.duration,
    segments: result.segments.map((segment) => ({
      id: segment.id,
      text: segment.text,
      start: segment.start,
      end: segment.end,
      words: segment.words.map((word) => ({
        word: word.word,
        start: word.start,
        end: word.end,
      })),
    })),
  };
}

/** Formats a time in seconds as mm:ss.d (for display). */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}
