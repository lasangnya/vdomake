'use client';

import { ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface FrameItem {
  screenshotUrl: string;
  scrollPosition: number;
  order: number;
  viewport: { width: number; height: number; deviceScaleFactor: number; isMobile: boolean };
}

export function ScreenshotGrid({
  frames,
  loading = false,
  className,
}: {
  frames: FrameItem[];
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-3', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/10] rounded-lg" />
        ))}
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <ImageOff className="h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">No screenshots captured yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-3', className)}>
      {frames.map((frame) => (
        <Card key={frame.screenshotUrl} className="overflow-hidden">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame.screenshotUrl}
              alt={`Screenshot ${frame.order + 1} at scroll ${frame.scrollPosition}px`}
              className="aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
            />
          </div>
          <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              #{String(frame.order + 1).padStart(2, '0')}
            </Badge>
            <span className="font-mono text-[10px] text-zinc-500">
              y={frame.scrollPosition} · {frame.viewport.width}×{frame.viewport.height}
              {frame.viewport.isMobile ? ' · mobile' : ''}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
