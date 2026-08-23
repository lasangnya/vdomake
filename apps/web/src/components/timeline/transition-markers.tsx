'use client';

import type { TimelineClipSpec } from './timeline-container';

/** Diamond markers between adjacent video clips indicating transitions. */
export function TransitionMarkers({
  clips,
  pxPerSecond,
}: {
  clips: TimelineClipSpec[];
  pxPerSecond: number;
}) {
  const markers = clips.slice(1).map((clip, index) => ({
    key: `transition-${clip.id}`,
    x: clip.start * pxPerSecond,
    from: clips[index].label,
    to: clip.label,
  }));

  return (
    <>
      {markers.map((marker) => (
        <div
          key={marker.key}
          title={`${marker.from} → ${marker.to}`}
          className="pointer-events-none absolute z-10 -translate-x-1/2 text-zinc-300"
          style={{ left: marker.x, top: 10 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="currentColor" />
          </svg>
        </div>
      ))}
    </>
  );
}
