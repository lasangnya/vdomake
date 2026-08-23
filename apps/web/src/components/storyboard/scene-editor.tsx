'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransitionPicker } from './transition-picker';
import { OverlayEditor } from './overlay-editor';
import type { CameraType, Scene } from '@/types/scene';

const CAMERA_TYPES: Array<{ value: CameraType; label: string }> = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'zoom-to', label: 'Zoom to' },
  { value: 'ken-burns', label: 'Ken Burns' },
];

export function SceneEditor({
  scene,
  open,
  onOpenChange,
  onSave,
}: {
  scene: Scene | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (scene: Scene) => void;
}) {
  if (!scene) return null;

  const update = (patch: Partial<Scene>) => {
    const next = { ...scene, ...patch };
    onSave(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit scene {scene.order + 1}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="scene-title">Title</Label>
            <Input
              id="scene-title"
              value={scene.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="font-mono text-sm text-zinc-600">{scene.duration}s</span>
            </div>
            <Slider
              min={2}
              max={12}
              step={0.5}
              value={[scene.duration]}
              onValueChange={(v) =>
                update({ duration: Array.isArray(v) ? (v[0] ?? scene.duration) : v })
              }
              className="py-1"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Transition</Label>
            <TransitionPicker
              value={scene.transition}
              onChange={(transition) => update({ transition })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scene-camera">Camera</Label>
            <Select
              value={scene.camera.type}
              onValueChange={(value) => {
                const type = value as CameraType;
                update({
                  camera:
                    type === 'static'
                      ? { type }
                      : { type, target: scene.camera.target ?? { x: 50, y: 50, scale: 1.5 } },
                });
              }}
            >
              <SelectTrigger id="scene-camera" className="h-9">
                <SelectValue placeholder="Camera" />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scene.camera.type !== 'static' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Target X %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={scene.camera.target?.x ?? 50}
                  onChange={(e) =>
                    update({
                      camera: {
                        ...scene.camera,
                        target: {
                          x: Number(e.target.value),
                          y: scene.camera.target?.y ?? 50,
                          scale: scene.camera.target?.scale ?? 1.5,
                        },
                      },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Target Y %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={scene.camera.target?.y ?? 50}
                  onChange={(e) =>
                    update({
                      camera: {
                        ...scene.camera,
                        target: {
                          x: scene.camera.target?.x ?? 50,
                          y: Number(e.target.value),
                          scale: scene.camera.target?.scale ?? 1.5,
                        },
                      },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500">Zoom</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  step={0.1}
                  value={scene.camera.target?.scale ?? 1.5}
                  onChange={(e) =>
                    update({
                      camera: {
                        ...scene.camera,
                        target: {
                          x: scene.camera.target?.x ?? 50,
                          y: scene.camera.target?.y ?? 50,
                          scale: Number(e.target.value),
                        },
                      },
                    })
                  }
                  className="h-8"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Overlays</Label>
            <OverlayEditor
              overlays={scene.overlays}
              onChange={(overlays) => update({ overlays })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
