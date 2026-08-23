'use client';

import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Scene } from '@/types/scene';

const TRANSITION_LABEL: Record<Scene['transition']['type'], string> = {
  fade: 'Fade',
  slide: 'Slide',
  zoom: 'Zoom',
  morph: 'Morph',
  wipe: 'Wipe',
  dissolve: 'Dissolve',
};

export function SceneCard({
  scene,
  screenshotUrl,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  overlay,
  className,
}: {
  scene: Scene;
  screenshotUrl?: string;
  onEdit?: (scene: Scene) => void;
  onDelete?: (sceneId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  overlay?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn('group overflow-hidden', className)}
      onPointerDown={onDragStart}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100">
        {screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshotUrl}
            alt={scene.title}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No screenshot
          </div>
        )}
        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/80 text-xs font-semibold text-white">
          {scene.order + 1}
        </span>
        {overlay}
      </div>
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{scene.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {TRANSITION_LABEL[scene.transition.type]} · {scene.duration}s
              {scene.camera.type !== 'static' ? ` · ${scene.camera.type}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-zinc-500 hover:text-zinc-900"
              onClick={() => onEdit?.(scene)}
              aria-label={`Edit ${scene.title}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-zinc-500 hover:text-red-600"
              onClick={() => onDelete?.(scene.id)}
              aria-label={`Delete ${scene.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <span className="cursor-grab text-zinc-300 active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {scene.overlays.length > 0 && (
            <Badge variant="outline" className="text-[10px] text-zinc-500">
              {scene.overlays.length} overlay{scene.overlays.length > 1 ? 's' : ''}
            </Badge>
          )}
          {scene.transition.type === 'zoom' && (
            <Badge variant="outline" className="text-[10px] text-violet-600">
              {Math.round(scene.camera.target?.scale ?? 1)}× zoom
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
