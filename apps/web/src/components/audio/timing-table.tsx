'use client';

import { Input } from '@/components/ui/input';
import { formatTime } from '@/lib/audio/transcription';
import type { Keyframe } from '@/types/keyframe';
import type { Scene } from '@/types/scene';

export function TimingTable({
  scenes,
  keyframes,
  onDurationChange,
}: {
  scenes: Scene[];
  keyframes: Keyframe[];
  onDurationChange?: (sceneId: string, duration: number) => void;
}) {
  const keyframeByScene = new Map(keyframes.map((kf) => [kf.sceneId, kf]));

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2">Scene</th>
            <th className="px-3 py-2">Start</th>
            <th className="px-3 py-2">End</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Transition</th>
          </tr>
        </thead>
        <tbody>
          {scenes.map((scene) => {
            const keyframe = keyframeByScene.get(scene.id);
            const duration = keyframe ? keyframe.endTime - keyframe.startTime : scene.duration;
            return (
              <tr key={scene.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-3 py-2 font-medium text-zinc-800">{scene.title}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-600">
                  {keyframe ? formatTime(keyframe.startTime) : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-600">
                  {keyframe ? formatTime(keyframe.endTime) : '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      step={0.5}
                      value={
                        Number.isFinite(duration) ? duration.toFixed(1) : scene.duration.toFixed(1)
                      }
                      onChange={(e) => onDurationChange?.(scene.id, Number(e.target.value))}
                      className="h-7 w-16 font-mono text-xs"
                      aria-label={`Duration for ${scene.title}`}
                    />
                    <span className="text-xs text-zinc-400">s</span>
                  </div>
                </td>
                <td className="px-3 py-2 capitalize text-zinc-600">{scene.transition.type}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
