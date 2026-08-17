'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { ThemeManifest } from '@/types/theme';
import { ScreenshotGrid, type FrameItem } from './screenshot-grid';
import { ThemePreview } from './theme-preview';

export function CaptureReview({
  frames,
  manifest,
}: {
  frames: FrameItem[];
  manifest: ThemeManifest | null;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section aria-label="Captured screenshots">
        <ScreenshotGrid frames={frames} />
      </section>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <ScrollArea className="max-h-[calc(100vh-6rem)]">
          <ThemePreview manifest={manifest} />
        </ScrollArea>
      </aside>
    </div>
  );
}
