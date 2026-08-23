'use client';

import { PlayCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PreviewPlayer({ videoUrl, duration }: { videoUrl: string; duration?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlayCircle className="h-4 w-4 text-violet-600" />
          Preview
        </CardTitle>
        {duration !== undefined && (
          <CardDescription>{duration.toFixed(1)}s · 1080p · 30fps</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-black"
        />
      </CardContent>
    </Card>
  );
}
