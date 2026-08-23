'use client';

import { Sparkles, Film, Target, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Scene } from '@/types/scene';

export interface SceneTemplate {
  id: 'intro' | 'feature' | 'cta' | 'outro';
  label: string;
  description: string;
  icon: typeof Film;
}

export const SCENE_TEMPLATES: SceneTemplate[] = [
  { id: 'intro', label: 'Intro', description: 'Hook with title overlay', icon: Sparkles },
  { id: 'feature', label: 'Feature', description: 'Highlight a key section', icon: Film },
  { id: 'cta', label: 'CTA', description: 'Call to action', icon: Target },
  { id: 'outro', label: 'Outro', description: 'Closing + thanks', icon: Flag },
];

const TEMPLATE_OVERLAYS: Record<SceneTemplate['id'], Scene['overlays']> = {
  intro: [
    {
      id: 't-intro',
      text: 'Introducing',
      position: { x: 50, y: 20 },
      fontSize: 56,
      color: '#ffffff',
    },
  ],
  feature: [
    {
      id: 't-feature',
      text: 'Key feature',
      position: { x: 50, y: 80 },
      fontSize: 40,
      color: '#ffffff',
    },
  ],
  cta: [
    {
      id: 't-cta',
      text: 'Get started today',
      position: { x: 50, y: 80 },
      fontSize: 44,
      color: '#ffffff',
    },
  ],
  outro: [
    {
      id: 't-outro',
      text: 'Thanks for watching',
      position: { x: 50, y: 80 },
      fontSize: 40,
      color: '#ffffff',
    },
  ],
};

export function SceneTemplates({
  firstScreenshotId,
  order,
  onAdd,
}: {
  firstScreenshotId?: string;
  order: number;
  onAdd: (scene: Scene) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-zinc-500">Add scene:</span>
      {SCENE_TEMPLATES.map(({ id, label, description, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-zinc-600"
                onClick={() =>
                  onAdd({
                    id: `scene-${Date.now()}`,
                    order,
                    screenshotId: firstScreenshotId ?? '',
                    title: label,
                    description: '',
                    duration: 4,
                    transition: { type: 'fade', duration: 0.6, easing: 'smooth' },
                    camera: { type: 'static' },
                    overlays: TEMPLATE_OVERLAYS[id],
                  })
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            }
          />
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
