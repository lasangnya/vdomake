import { describe, expect, it, vi } from 'vitest';
import { formatTime, transcribeAudio, validateAudioFile } from '@/lib/audio/transcription';

function makeFile(name: string, size = 1000, type = 'audio/mpeg'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateAudioFile', () => {
  it('accepts supported audio extensions', () => {
    for (const name of ['voice.mp3', 'clip.wav', 'narration.m4a', 'audio.ogg', 'sample.webm']) {
      expect(validateAudioFile(makeFile(name)).ok).toBe(true);
    }
  });

  it('rejects unsupported extensions', () => {
    const result = validateAudioFile(makeFile('file.txt'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Unsupported file type/);
  });

  it('rejects oversized files', () => {
    const huge = makeFile('big.mp3', 60 * 1024 * 1024);
    const result = validateAudioFile(huge);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/too large/);
  });
});

describe('transcribeAudio', () => {
  it('passes the buffer and filename through to the callable', async () => {
    const callable = vi.fn(async () => ({
      text: 'hello world',
      language: 'en',
      duration: 1.5,
      segments: [
        {
          id: 0,
          text: 'hello world',
          start: 0,
          end: 1.5,
          words: [
            { word: 'hello', start: 0, end: 0.6 },
            { word: 'world', start: 0.7, end: 1.5 },
          ],
        },
      ],
    }));
    const result = await transcribeAudio(Buffer.from('audio'), 'voice.mp3', {
      transcribe: callable,
    });
    expect(callable).toHaveBeenCalledWith(expect.any(Buffer), 'voice.mp3');
    expect(result.text).toBe('hello world');
    expect(result.segments[0].words).toHaveLength(2);
  });
});

describe('formatTime', () => {
  it('formats seconds as mm:ss.d', () => {
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(65.4)).toBe('01:05.4');
    expect(formatTime(600)).toBe('10:00.0');
  });
});
