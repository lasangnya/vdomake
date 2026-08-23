import type { AutoSyncSuggestion, AudioTrack } from '@/types/keyframe';
import type { Scene } from '@/types/scene';

export interface AutoSyncInput {
  transcript: AudioTrack['transcript'];
  scenes: Array<Pick<Scene, 'id' | 'title' | 'description'>>;
  minPauseMs?: number;
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'for',
  'in',
  'on',
  'with',
  'is',
  'are',
  'it',
  'this',
  'that',
  'we',
  'you',
  'your',
  'our',
  'at',
  'by',
  'as',
  'be',
  'from',
  'has',
  'have',
  'was',
  'were',
  'will',
  'would',
  'can',
  'could',
  'but',
  'so',
  'if',
]);

export interface Pause {
  at: number;
  gapMs: number;
}

/** Finds natural transition points — gaps between consecutive transcript segments ≥ minGapMs. */
export function detectPauses(
  segments: AudioTrack['transcript']['segments'],
  minGapMs = 500,
): Pause[] {
  const pauses: Pause[] = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const gapMs = (segments[i + 1].start - segments[i].end) * 1000;
    if (gapMs >= minGapMs) {
      pauses.push({ at: segments[i].end, gapMs });
    }
  }
  return pauses;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/** Keyword set for a scene (title + description), deduped. */
export function sceneKeywords(scene: Pick<Scene, 'title' | 'description'>): Set<string> {
  return new Set([...tokenize(scene.title), ...tokenize(scene.description)]);
}

/** Count of a scene's keywords found in a transcript segment. */
export function segmentKeywordOverlap(
  scene: Pick<Scene, 'title' | 'description'>,
  segmentText: string,
): number {
  const keywords = sceneKeywords(scene);
  if (keywords.size === 0) return 0;
  const segmentTokens = new Set(tokenize(segmentText));
  let hits = 0;
  for (const keyword of keywords) {
    if (segmentTokens.has(keyword)) hits += 1;
  }
  return hits;
}

function argMax(scores: number[]): number {
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < scores.length; i += 1) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      best = i;
    }
  }
  return bestScore > 0 ? best : -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Picks `count` pauses spread as evenly as possible across the timeline. */
function choosePauses(pauses: Pause[], count: number, duration: number): number[] {
  if (count <= 0) return [];
  if (pauses.length <= count) return pauses.map((p) => p.at);
  const chosen: number[] = [];
  for (let i = 1; i <= count; i += 1) {
    const target = (duration * i) / (count + 1);
    const nearest = pauses.reduce((best, pause) =>
      Math.abs(pause.at - target) < Math.abs(best.at - target) ? pause : best,
    );
    chosen.push(nearest.at);
  }
  return [...new Set(chosen)].sort((a, b) => a - b);
}

/**
 * Proposes keyframe placements for each scene based on the transcript:
 * natural pauses define scene slots, and keyword overlap between scene
 * content and transcript segments refines each scene's position. Pure and
 * deterministic — no LLM required, so it is fully unit-testable.
 */
export function buildAutoSyncSuggestions(input: AutoSyncInput): AutoSyncSuggestion[] {
  const { transcript, scenes, minPauseMs = 500 } = input;
  const segments = transcript.segments;
  if (scenes.length === 0 || segments.length === 0) {
    return [];
  }

  const duration = Math.max(...segments.map((segment) => segment.end), 0);
  const pauses = detectPauses(segments, minPauseMs);

  const overlap = scenes.map((scene) =>
    segments.map((segment) => segmentKeywordOverlap(scene, segment.text)),
  );

  // Scene slot boundaries: use pauses when we have enough, otherwise split by time.
  const boundaries: number[] = [0];
  if (pauses.length >= scenes.length - 1) {
    boundaries.push(...choosePauses(pauses, scenes.length - 1, duration));
  } else {
    for (let i = 1; i < scenes.length; i += 1) {
      boundaries.push((duration * i) / scenes.length);
    }
  }
  boundaries.push(duration);

  return scenes.map((scene, index) => {
    const slotStart = boundaries[index] ?? 0;
    const slotEnd = boundaries[index + 1] ?? duration;
    const keywordCount = sceneKeywords(scene).size;

    let startTime = slotStart;
    let endTime = slotEnd;

    const bestSegment = argMax(overlap[index]);
    if (bestSegment !== -1) {
      const segment = segments[bestSegment];
      startTime = clamp(segment.start, slotStart, Math.max(slotStart, slotEnd - 1));
      endTime = clamp(segment.end, startTime + 0.5, slotEnd);
    }

    if (endTime <= startTime) {
      endTime = startTime + 1;
    }

    const bestScore = bestSegment === -1 ? 0 : (overlap[index][bestSegment] ?? 0);
    const confidence =
      keywordCount > 0 ? clamp(bestScore / keywordCount, 0, 1) : bestSegment === -1 ? 0.3 : 0.5;

    return { sceneId: scene.id, startTime, endTime, confidence };
  });
}
