import { describe, expect, it } from 'vitest';
import {
  buildAutoSyncSuggestions,
  detectPauses,
  segmentKeywordOverlap,
} from '@/lib/audio/auto-sync';
import type { AudioTrack } from '@/types/keyframe';
import type { Scene } from '@/types/scene';

const segments: AudioTrack['transcript']['segments'] = [
  { id: 0, text: 'Welcome to our platform and its main dashboard', start: 0, end: 3, words: [] },
  { id: 1, text: 'Here you can manage your projects and settings', start: 4, end: 7, words: [] },
  { id: 2, text: 'The pricing page shows our plans and billing', start: 9, end: 12, words: [] },
  { id: 3, text: 'Sign up today to get started for free', start: 13, end: 16, words: [] },
];

const transcript: AudioTrack['transcript'] = {
  text: segments.map((s) => s.text).join(' '),
  language: 'en',
  segments,
};

const scenes: Array<Pick<Scene, 'id' | 'title' | 'description'>> = [
  { id: 'sc-1', title: 'Dashboard', description: 'manage projects' },
  { id: 'sc-2', title: 'Pricing', description: 'plans and billing' },
  { id: 'sc-3', title: 'Sign up', description: 'get started free' },
];

describe('detectPauses', () => {
  it('finds gaps above the threshold', () => {
    const pauses = detectPauses(segments, 500);
    // Gaps: 3→4 (1s), 7→9 (2s), 12→13 (1s) — all ≥ 500ms.
    expect(pauses).toEqual([
      { at: 3, gapMs: 1000 },
      { at: 7, gapMs: 2000 },
      { at: 12, gapMs: 1000 },
    ]);
  });

  it('returns empty when gaps are below the threshold', () => {
    expect(detectPauses(segments, 5000)).toEqual([]);
  });
});

describe('segmentKeywordOverlap', () => {
  it('counts scene keywords found in segment text', () => {
    expect(segmentKeywordOverlap(scenes[1], 'The pricing page shows our plans and billing')).toBe(
      3,
    );
  });

  it('returns 0 for unrelated content', () => {
    expect(segmentKeywordOverlap(scenes[2], 'Welcome to our platform')).toBe(0);
  });
});

describe('buildAutoSyncSuggestions', () => {
  it('distributes scenes across the transcript timeline', () => {
    const suggestions = buildAutoSyncSuggestions({ transcript, scenes });
    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((s) => s.sceneId)).toEqual(['sc-1', 'sc-2', 'sc-3']);
    for (const suggestion of suggestions) {
      expect(suggestion.endTime).toBeGreaterThan(suggestion.startTime);
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('places the pricing scene near its matching segment', () => {
    const suggestions = buildAutoSyncSuggestions({ transcript, scenes });
    const pricing = suggestions.find((s) => s.sceneId === 'sc-2');
    // The pricing segment is 9–12; the slot should center near it.
    expect(pricing?.startTime).toBeGreaterThanOrEqual(7);
  });

  it('produces monotonic non-overlapping ranges', () => {
    const suggestions = buildAutoSyncSuggestions({ transcript, scenes });
    for (let i = 1; i < suggestions.length; i += 1) {
      expect(suggestions[i].startTime).toBeGreaterThanOrEqual(suggestions[i - 1].endTime);
    }
  });

  it('returns empty when there is no transcript', () => {
    expect(
      buildAutoSyncSuggestions({ transcript: { text: '', language: 'en', segments: [] }, scenes }),
    ).toEqual([]);
  });

  it('returns empty when there are no scenes', () => {
    expect(buildAutoSyncSuggestions({ transcript, scenes: [] })).toEqual([]);
  });

  it('handles a single scene', () => {
    const suggestions = buildAutoSyncSuggestions({ transcript, scenes: [scenes[0]] });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].endTime).toBeGreaterThan(suggestions[0].startTime);
  });
});
