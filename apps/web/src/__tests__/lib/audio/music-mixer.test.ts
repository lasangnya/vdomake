import { describe, it, expect } from 'vitest';
import {
  computeDuckSegments,
  buildMusicFilter,
  buildAudioMix,
  type MusicSettings,
} from '@/lib/audio/music-mixer';

const music: MusicSettings = {
  volume: 0.5,
  fadeInDuration: 1,
  fadeOutDuration: 1,
  loop: false,
  duration: 10,
};

describe('music-mixer', () => {
  describe('computeDuckSegments', () => {
    it('pads each voiceover segment by the default 200ms', () => {
      const segments = [{ start: 1, end: 2 }];
      expect(computeDuckSegments(segments)).toEqual([{ start: 0.8, end: 2.2 }]);
    });

    it('clamps the padding to 0 at the start', () => {
      const segments = [{ start: 0, end: 0.1 }];
      expect(computeDuckSegments(segments)[0].start).toBe(0);
    });

    it('supports a custom padding in ms', () => {
      const segments = [{ start: 1, end: 2 }];
      expect(computeDuckSegments(segments, 500)).toEqual([{ start: 0.5, end: 2.5 }]);
    });
  });

  describe('buildMusicFilter', () => {
    it('starts with the base volume', () => {
      expect(buildMusicFilter(music, [])).toMatch(/^volume=0\.50/);
    });

    it('adds fade in/out when durations are set', () => {
      const filter = buildMusicFilter(music, []);
      expect(filter).toContain('afade=t=in:st=0:d=1.00');
      expect(filter).toContain('afade=t=out:st=9.00:d=1.00');
    });

    it('emits a volume duck for each voiceover segment', () => {
      const filter = buildMusicFilter(music, [
        { start: 1, end: 2 },
        { start: 3, end: 4 },
      ]);
      expect(filter).toContain("volume=0.25:enable='between(t,1.00,2.00)'");
      expect(filter).toContain("volume=0.25:enable='between(t,3.00,4.00)'");
    });

    it('omits fades and ducks when unset/empty', () => {
      const filter = buildMusicFilter({ ...music, fadeInDuration: 0, fadeOutDuration: 0 }, []);
      expect(filter).not.toContain('afade');
      expect(filter).toBe('volume=0.50');
    });
  });

  describe('buildAudioMix', () => {
    it('delays the voiceover and mixes music when present', () => {
      const mix = buildAudioMix(500, music, [{ start: 1, end: 2 }]);
      expect(mix.voiceoverFilter).toBe('[1:a]adelay=500|500[vo]');
      expect(mix.musicFilter).toContain('[2:a]');
      expect(mix.mix).toBe('[vo][mus]amix=inputs=2:duration=first:dropout_transition=2[aout]');
    });

    it('mixes only the voiceover when there is no music', () => {
      const mix = buildAudioMix(0, null, []);
      expect(mix.musicFilter).toBe('');
      expect(mix.mix).toBe('[vo]amix=inputs=1:duration=first[aout]');
    });
  });
});
