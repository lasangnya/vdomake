'use client';

import { useTimelineStore } from '@/stores/timeline-store';
import { cn } from '@/lib/utils';

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function PlaybackControls() {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const playhead = useTimelineStore((s) => s.playhead);
  const duration = useTimelineStore((s) => s.duration);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const setPlaybackSpeed = useTimelineStore((s) => s.setPlaybackSpeed);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const skip = (delta: number) =>
    setPlayhead(Math.min(Math.max(0, playhead + delta), Math.max(duration, 0.1)));
  const scrub = (time: number) => {
    setPlayhead(time);
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={togglePlay}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700"
        type="button"
      >
        {isPlaying ? (
          <>
            <span className="text-xs">❚❚</span> Pause
          </>
        ) : (
          <>▶ Play</>
        )}
      </button>
      <button
        onClick={() => skip(-5)}
        className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-2 text-xs text-zinc-600 hover:bg-zinc-50"
        title="Back 5s"
        type="button"
      >
        ⏮
      </button>
      <button
        onClick={() => skip(5)}
        className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-2 text-xs text-zinc-600 hover:bg-zinc-50"
        title="Forward 5s"
        type="button"
      >
        ⏭
      </button>

      <div className="flex items-center gap-1 rounded-md border border-zinc-300 p-0.5">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={cn(
              'rounded px-2 py-1 text-xs',
              playbackSpeed === speed
                ? 'bg-violet-100 font-semibold text-violet-700'
                : 'text-zinc-500 hover:bg-zinc-100',
            )}
            type="button"
          >
            {speed}×
          </button>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.01}
        value={playhead}
        onChange={(e) => scrub(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-violet-600"
        aria-label="Timeline playhead"
      />
    </div>
  );
}
