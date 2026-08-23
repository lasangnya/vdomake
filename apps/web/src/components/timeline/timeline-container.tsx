'use client';

import { useRef } from 'react';
import { useTimelineStore } from '@/stores/timeline-store';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/audio/transcription';
import { TransitionMarkers } from './transition-markers';

export interface TimelineClipSpec {
  id: string;
  start: number;
  end: number;
  label: string;
  thumbnailUrl?: string;
  track: 'video' | 'voiceover' | 'music' | 'text';
}

export function TimelineContainer({
  clips,
  onSeek,
  onTrim,
  onSelect,
  selectedId,
}: {
  clips: TimelineClipSpec[];
  onSeek?: (time: number) => void;
  onTrim?: (id: string, start: number, end: number) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const playhead = useTimelineStore((s) => s.playhead);
  const duration = useTimelineStore((s) => s.duration);
  const zoom = useTimelineStore((s) => s.zoom);
  const rulerRef = useRef<HTMLButtonElement>(null);

  const pxPerSecond = 60 * zoom;
  const totalWidth = Math.max(duration * pxPerSecond, 200);

  const handleRulerClick = (event: React.MouseEvent) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (event.clientX - rect.left) / totalWidth;
    onSeek?.(Math.min(Math.max(0, ratio * duration), duration));
  };

  const timeMarkers: number[] = [];
  for (let t = 0; t <= Math.ceil(duration); t += 1) timeMarkers.push(t);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="relative" style={{ width: totalWidth }}>
        {/* Ruler */}
        <button
          ref={rulerRef}
          type="button"
          onClick={handleRulerClick}
          className="relative block h-7 w-full cursor-pointer border-b border-zinc-200 bg-zinc-50 text-left"
        >
          {timeMarkers.map((t) => (
            <span
              key={t}
              className="absolute top-1 font-mono text-[9px] text-zinc-400"
              style={{ left: t * pxPerSecond }}
            >
              {formatTime(t)}
            </span>
          ))}
        </button>

        {/* Tracks */}
        {(['video', 'voiceover', 'text'] as const).map((track) => {
          const trackClips = clips.filter((c) => c.track === track);
          return (
            <div key={track} className="relative h-14 border-b border-zinc-100 last:border-0">
              <span className="absolute -left-1 top-1 z-10 rounded bg-zinc-100 px-1 text-[9px] uppercase text-zinc-500">
                {track}
              </span>
              {trackClips.map((clip) => {
                const left = clip.start * pxPerSecond;
                const width = Math.max((clip.end - clip.start) * pxPerSecond, 8);
                const isSelected = clip.id === selectedId;
                return (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(clip.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onSelect?.(clip.id);
                      }
                    }}
                    className={cn(
                      'group absolute top-1 flex h-12 cursor-pointer items-center overflow-hidden rounded border transition-colors',
                      isSelected
                        ? 'border-violet-500 ring-1 ring-violet-300'
                        : 'border-zinc-300 hover:border-violet-400',
                    )}
                    style={{ left, width }}
                  >
                    {clip.thumbnailUrl && clip.track === 'video' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={clip.thumbnailUrl} alt="" className="h-full w-1/3 object-cover" />
                    ) : (
                      <div
                        className={cn(
                          'flex h-full w-full items-center justify-center text-[10px]',
                          clip.track === 'voiceover'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-zinc-50 text-zinc-500',
                        )}
                      >
                        <span className="truncate px-1">{clip.label}</span>
                      </div>
                    )}
                    {clip.track === 'video' && (
                      <div className="flex flex-1 flex-col justify-center gap-0.5 bg-zinc-50/90 px-1">
                        <span className="truncate text-[10px] font-medium text-zinc-700">
                          {clip.label}
                        </span>
                        <span className="font-mono text-[9px] text-zinc-400">
                          {formatTime(clip.start)}–{formatTime(clip.end)}
                        </span>
                      </div>
                    )}
                    {/* Trim handles */}
                    {clip.track === 'video' && onTrim && (
                      <>
                        <div
                          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-violet-300 opacity-0 group-hover:opacity-100"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const original = clip.start;
                            const handleMove = (moveEvent: PointerEvent) => {
                              const dx = (moveEvent.clientX - startX) / pxPerSecond;
                              onTrim(clip.id, Math.max(0, original + dx), clip.end);
                            };
                            const handleUp = () => {
                              window.removeEventListener('pointermove', handleMove);
                              window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                        />
                        <div
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-violet-300 opacity-0 group-hover:opacity-100"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const original = clip.end;
                            const handleMove = (moveEvent: PointerEvent) => {
                              const dx = (moveEvent.clientX - startX) / pxPerSecond;
                              onTrim(
                                clip.id,
                                clip.start,
                                Math.max(clip.start + 0.1, original + dx),
                              );
                            };
                            const handleUp = () => {
                              window.removeEventListener('pointermove', handleMove);
                              window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                        />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Transition markers between video clips */}
        <TransitionMarkers
          clips={clips.filter((c) => c.track === 'video')}
          pxPerSecond={pxPerSecond}
        />

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 z-20 w-px bg-violet-600"
          style={{ left: playhead * pxPerSecond, height: '100%' }}
        >
          <div className="-ml-1 h-2 w-2 rounded-full bg-violet-600" />
        </div>
      </div>
    </div>
  );
}
