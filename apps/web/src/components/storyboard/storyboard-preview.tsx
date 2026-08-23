'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Scene } from '@/types/scene';

export function StoryboardPreview({
  scenes,
  screenshotUrls,
}: {
  scenes: Scene[];
  screenshotUrls?: Record<string, string>;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const scene = scenes[Math.min(index, Math.max(scenes.length - 1, 0))];
  const url = scene ? screenshotUrls?.[scene.screenshotId] : undefined;

  const durationMs = useMemo(() => (scene ? Math.max(2000, scene.duration * 1000) : 4000), [scene]);

  useEffect(() => {
    if (!playing || scenes.length === 0) return;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % scenes.length);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [playing, durationMs, index, scenes.length]);

  if (scenes.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed text-sm text-zinc-400">
        No scenes to preview
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={scene?.id}
            src={url}
            alt={scene?.title ?? ''}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No screenshot
          </div>
        )}
        {scene?.overlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute max-w-[80%]"
            style={{
              left: `${overlay.position.x}%`,
              top: `${overlay.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: overlay.fontSize / 4,
              color: overlay.color,
              fontFamily: overlay.fontFamily,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            {overlay.text}
          </div>
        ))}
        <span className="absolute right-3 top-3 rounded-full bg-zinc-900/70 px-2.5 py-1 font-mono text-xs text-white">
          {index + 1} / {scenes.length}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIndex((i) => (i - 1 + scenes.length) % scenes.length)}
            aria-label="Previous scene"
            className="text-zinc-500"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause preview' : 'Play preview'}
            className="text-zinc-500"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIndex((i) => (i + 1) % scenes.length)}
            aria-label="Next scene"
            className="text-zinc-500"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setPlaying(false);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-violet-600' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400',
              )}
              aria-label={`Go to scene ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
