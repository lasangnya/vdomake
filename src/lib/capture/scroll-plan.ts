export interface ScrollPlanOptions {
  /** Total document height in CSS pixels. */
  pageHeight: number;
  /** Viewport height in CSS pixels. */
  viewportHeight: number;
  /** Fraction of the viewport that overlaps the previous frame (0-1). Default 0.1. */
  overlapRatio?: number;
  /** Hard cap on the number of frames. Default 40. */
  maxFrames?: number;
}

/**
 * Computes the scroll Y positions to capture for a full-page scroll sequence.
 * Positions advance by (1 - overlap) * viewportHeight so consecutive frames
 * overlap slightly, guaranteeing no content is missed between shots.
 */
export function computeScrollPositions(options: ScrollPlanOptions): number[] {
  const { pageHeight, viewportHeight, overlapRatio = 0.1, maxFrames = 40 } = options;
  if (viewportHeight <= 0 || pageHeight <= 0) {
    return [0];
  }

  const step = Math.max(
    1,
    Math.floor(viewportHeight * (1 - Math.min(Math.max(overlapRatio, 0), 0.9))),
  );
  const maxScroll = Math.max(0, pageHeight - viewportHeight);
  const positions: number[] = [];

  for (let y = 0; y < maxScroll && positions.length < maxFrames; y += step) {
    positions.push(y);
  }
  if (positions.length < maxFrames && (positions.length === 0 || positions.at(-1) !== maxScroll)) {
    positions.push(maxScroll);
  }
  return positions;
}

/** Merges near-duplicate scroll positions (within 2px) to shrink the list. */
export function dedupePositions(positions: number[], tolerance = 2): number[] {
  const result: number[] = [];
  for (const position of positions) {
    if (result.length === 0 || Math.abs(position - result.at(-1)!) > tolerance) {
      result.push(position);
    } else if (position > result.at(-1)!) {
      result[result.length - 1] = position;
    }
  }
  return result;
}
