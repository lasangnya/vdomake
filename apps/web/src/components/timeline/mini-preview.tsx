'use client';

import { useEffect, useRef } from 'react';
import { useTimelineStore } from '@/stores/timeline-store';

/**
 * Live preview synced to the timeline playhead. Plays/pauses/seeks the last
 * rendered preview MP4; the playhead follows the video while it plays.
 */
export function MiniPreview({ src }: { src?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playhead = useTimelineStore((s) => s.playhead);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);

  // Pause when the store stops playback.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isPlaying) video.pause();
  }, [isPlaying]);

  // Play from the playhead when the store starts playback.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (isPlaying) {
      if (Math.abs(video.currentTime - playhead) > 0.25) video.currentTime = playhead;
      void video.play().catch(() => undefined);
    }
  }, [isPlaying, playhead, src]);

  // While playing, keep the store playhead synced to the video.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      if (!video.paused) setPlayhead(video.currentTime);
    };
    const onEnded = () => setIsPlaying(false);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
    };
  }, [setPlayhead, setIsPlaying]);

  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400">
        No preview yet — render the video from the Generate tab.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black shadow-sm">
      <video
        ref={videoRef}
        src={src}
        className="aspect-video w-full"
        controls
        preload="metadata"
        data-testid="mini-preview"
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
