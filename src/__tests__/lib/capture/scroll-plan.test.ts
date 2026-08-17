import { describe, expect, it } from 'vitest';
import { computeScrollPositions, dedupePositions } from '@/lib/capture/scroll-plan';

describe('computeScrollPositions', () => {
  it('returns just the top for a page shorter than the viewport', () => {
    expect(computeScrollPositions({ pageHeight: 500, viewportHeight: 800 })).toEqual([0]);
  });

  it('steps by (1 - overlap) * viewport height', () => {
    const positions = computeScrollPositions({
      pageHeight: 3000,
      viewportHeight: 900,
      overlapRatio: 0.1,
    });
    expect(positions[0]).toBe(0);
    expect(positions[1]).toBe(810);
    expect(positions[2]).toBe(1620);
  });

  it('always includes the final scroll position', () => {
    const positions = computeScrollPositions({
      pageHeight: 2000,
      viewportHeight: 900,
      overlapRatio: 0.2,
    });
    expect(positions.at(-1)).toBe(2000 - 900);
  });

  it('caps the number of frames', () => {
    const positions = computeScrollPositions({
      pageHeight: 50000,
      viewportHeight: 800,
      maxFrames: 20,
    });
    expect(positions.length).toBeLessThanOrEqual(20);
  });

  it('handles degenerate input', () => {
    expect(computeScrollPositions({ pageHeight: 0, viewportHeight: 0 })).toEqual([0]);
    expect(computeScrollPositions({ pageHeight: -5, viewportHeight: 100 })).toEqual([0]);
  });
});

describe('dedupePositions', () => {
  it('keeps the max within tolerance', () => {
    expect(dedupePositions([0, 1, 810, 811, 1620])).toEqual([1, 811, 1620]);
  });

  it('passes through distinct positions', () => {
    expect(dedupePositions([0, 500, 1000])).toEqual([0, 500, 1000]);
  });
});
