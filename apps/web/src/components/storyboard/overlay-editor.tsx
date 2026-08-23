'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TextOverlay } from '@/types/scene';

export function OverlayEditor({
  overlays,
  onChange,
}: {
  overlays: TextOverlay[];
  onChange: (overlays: TextOverlay[]) => void;
}) {
  const update = (id: string, patch: Partial<TextOverlay>) => {
    onChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  return (
    <div className="space-y-3">
      {overlays.length === 0 && (
        <p className="text-sm text-zinc-500">No text overlays for this scene.</p>
      )}
      {overlays.map((overlay) => (
        <div key={overlay.id} className="space-y-2 rounded-lg border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Overlay</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-zinc-400 hover:text-red-600"
              onClick={() => onChange(overlays.filter((o) => o.id !== overlay.id))}
              aria-label="Remove overlay"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            value={overlay.text}
            onChange={(e) => update(overlay.id, { text: e.target.value })}
            placeholder="Overlay text"
            className="h-8 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">X %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={overlay.position.x}
                onChange={(e) =>
                  update(overlay.id, {
                    position: { ...overlay.position, x: Number(e.target.value) },
                  })
                }
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">Y %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={overlay.position.y}
                onChange={(e) =>
                  update(overlay.id, {
                    position: { ...overlay.position, y: Number(e.target.value) },
                  })
                }
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">Size</Label>
              <Input
                type="number"
                min={12}
                max={96}
                value={overlay.fontSize}
                onChange={(e) => update(overlay.id, { fontSize: Number(e.target.value) })}
                className="h-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500">Color</Label>
            <Input
              type="color"
              value={overlay.color}
              onChange={(e) => update(overlay.id, { color: e.target.value })}
              className="h-8 w-16"
              aria-label="Overlay color"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...overlays,
            {
              id: `ov-${Date.now()}`,
              text: 'New overlay',
              position: { x: 10, y: 10 },
              fontSize: 48,
              color: '#ffffff',
            },
          ])
        }
        className="text-zinc-600"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add overlay
      </Button>
    </div>
  );
}
