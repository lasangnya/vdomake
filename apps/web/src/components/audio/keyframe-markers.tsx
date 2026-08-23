'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/audio/transcription';
import type { Keyframe } from '@/types/keyframe';

/**
 * Pure marker layer: renders keyframes as positioned bars over a container
 * whose width represents the full audio duration. Non-interactive by design —
 * dragging is handled by the waveform (wavesurfer regions). Testable without
 * a canvas.
 */
export function KeyframeMarkers({
  keyframes,
  duration,
  currentTime,
  onRemove,
  className,
}: {
  keyframes: Keyframe[];
  duration: number;
  currentTime?: number;
  onRemove?: (keyframeId: string) => void;
  className?: string;
}) {
  if (duration <= 0) return null;

  const activeKeyframe =
    currentTime !== undefined
      ? keyframes.find((kf) => currentTime >= kf.startTime && currentTime < kf.endTime)
      : undefined;

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} aria-hidden>
      {keyframes.map((keyframe) => {
        const left = (keyframe.startTime / duration) * 100;
        const width = Math.max(((keyframe.endTime - keyframe.startTime) / duration) * 100, 1.5);
        const isActive = activeKeyframe?.id === keyframe.id;
        return (
          <div
            key={keyframe.id}
            className={cn(
              'absolute top-0 h-full border-x-2 transition-colors',
              isActive
                ? 'border-violet-500 bg-violet-500/20'
                : 'border-emerald-500/70 bg-emerald-500/10',
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
            title={`${formatTime(keyframe.startTime)} → ${formatTime(keyframe.endTime)}`}
          >
            <span
              className={cn(
                'absolute -top-6 left-0 rounded px-1 font-mono text-[10px]',
                isActive ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-100',
              )}
            >
              {formatTime(keyframe.startTime)}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(keyframe.id)}
                className="pointer-events-auto absolute -top-6 right-0 hidden rounded-full bg-red-500 p-0.5 text-white group-hover:block hover:bg-red-600"
                aria-label={`Remove keyframe ${formatTime(keyframe.startTime)}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
