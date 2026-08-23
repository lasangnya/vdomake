'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Scene } from '@/types/scene';

/**
 * Shows the AI's reasoning (per-scene description) so the user can see *why*
 * each scene exists. Descriptions are also surfaced in the SceneEditor.
 */
export function AiSuggestionsPanel({ scenes }: { scenes: Scene[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-600" />
          AI reasoning
        </CardTitle>
        <CardDescription>Why each scene is in the storyboard</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-72">
          <ol className="space-y-3">
            {scenes.map((scene) => (
              <li key={scene.id} className="rounded-lg bg-zinc-50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-800">
                    {scene.order + 1}. {scene.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                    {scene.duration}s
                  </span>
                </div>
                {scene.description && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{scene.description}</p>
                )}
              </li>
            ))}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
