'use client';

import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/audio/transcription';
import { WaveformView } from './waveform-view';
import type { Keyframe } from '@/types/keyframe';
import type { Scene } from '@/types/scene';

/**
 * Split view: the audio waveform on top and the storyboard thumbnails below,
 * with the currently-audible scene highlighted.
 */
export function SceneSyncView({
  audioUrl,
  keyframes,
  scenes,
  screenshotUrls,
  currentTime,
  onKeyframesChange,
  onPlayheadChange,
}: {
  audioUrl: string;
  keyframes: Keyframe[];
  scenes: Scene[];
  screenshotUrls?: Record<string, string>;
  currentTime: number;
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  onPlayheadChange: (time: number) => void;
}) {
  const activeSceneId = keyframes.find(
    (kf) => currentTime >= kf.startTime && currentTime < kf.endTime,
  )?.sceneId;

  return (
    <div className="space-y-4">
      <WaveformView
        audioUrl={audioUrl}
        keyframes={keyframes}
        onKeyframesChange={onKeyframesChange}
        onPlayheadChange={onPlayheadChange}
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {scenes.map((scene) => {
          const keyframe = keyframes.find((kf) => kf.sceneId === scene.id);
          const isActive = scene.id === activeSceneId;
          return (
            <div
              key={scene.id}
              className={cn(
                'w-32 shrink-0 rounded-lg border bg-white p-2 transition-colors',
                isActive ? 'border-violet-500 ring-1 ring-violet-300' : 'border-zinc-200',
              )}
            >
              <div className="aspect-[16/10] overflow-hidden rounded bg-zinc-100">
                {screenshotUrls?.[scene.screenshotId] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={screenshotUrls[scene.screenshotId]}
                    alt={scene.title}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                    No shot
                  </div>
                )}
              </div>
              <p className="mt-1 truncate text-xs font-medium text-zinc-800">{scene.title}</p>
              <p className="font-mono text-[10px] text-zinc-500">
                {keyframe
                  ? `${formatTime(keyframe.startTime)}–${formatTime(keyframe.endTime)}`
                  : 'untagged'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
