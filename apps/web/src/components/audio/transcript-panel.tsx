'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/audio/transcription';
import type { AudioTrack } from '@/types/keyframe';

/**
 * Scrollable transcript with clickable timestamps. The current word is
 * highlighted based on the playback position.
 */
export function TranscriptPanel({
  transcript,
  currentTime,
  onSeek,
}: {
  transcript: AudioTrack['transcript'];
  currentTime?: number;
  onSeek?: (time: number) => void;
}) {
  const activeWord = useMemo(() => {
    if (currentTime === undefined) return null;
    for (const segment of transcript.segments) {
      if (currentTime < segment.start || currentTime > segment.end) continue;
      for (const word of segment.words) {
        if (currentTime >= word.start && currentTime <= word.end) {
          return { segmentId: segment.id, word };
        }
      }
      return { segmentId: segment.id, word: null };
    }
    return null;
  }, [transcript.segments, currentTime]);

  if (transcript.segments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-500">
        No transcript yet — upload audio to transcribe it.
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-72 rounded-lg border border-zinc-200">
      <div className="space-y-3 p-4">
        {transcript.segments.map((segment) => {
          const isActive = activeWord?.segmentId === segment.id;
          return (
            <div key={segment.id} className={cn('rounded-lg p-2', isActive && 'bg-violet-50')}>
              <button
                type="button"
                onClick={() => onSeek?.(segment.start)}
                className="mb-1 font-mono text-[10px] text-violet-600 hover:underline"
              >
                {formatTime(segment.start)}
              </button>
              <p className="text-sm leading-relaxed text-zinc-700">
                {segment.words.length > 0
                  ? segment.words.map((word, index) => {
                      const isCurrent = activeWord?.word === word && isActive;
                      return (
                        <span
                          key={`${word.word}-${index}`}
                          className={cn(isCurrent && 'rounded bg-violet-200 font-medium')}
                        >
                          {word.word}{' '}
                        </span>
                      );
                    })
                  : segment.text}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
