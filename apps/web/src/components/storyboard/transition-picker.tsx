'use client';

import { cn } from '@/lib/utils';
import type { Scene } from '@/types/scene';

const TRANSITIONS: Array<{
  type: Scene['transition']['type'];
  label: string;
  hint: string;
}> = [
  { type: 'fade', label: 'Fade', hint: 'Cross-dissolve' },
  { type: 'slide', label: 'Slide', hint: 'Push left' },
  { type: 'zoom', label: 'Zoom', hint: 'Pull focus' },
  { type: 'morph', label: 'Morph', hint: 'Shape shift' },
  { type: 'wipe', label: 'Wipe', hint: 'Reveal sweep' },
  { type: 'dissolve', label: 'Dissolve', hint: 'Soft blend' },
];

const EASINGS: Scene['transition']['easing'][] = ['smooth', 'spring', 'linear'];

export function TransitionPicker({
  value,
  onChange,
}: {
  value: Scene['transition'];
  onChange: (transition: Scene['transition']) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {TRANSITIONS.map(({ type, label, hint }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange({ ...value, type })}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-lg border p-2.5 text-center transition-colors',
              value.type === type
                ? 'border-violet-500 bg-violet-50 text-violet-900'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
            )}
            aria-pressed={value.type === type}
          >
            <span className="text-sm font-medium capitalize">{label}</span>
            <span className="text-[10px] text-zinc-400">{hint}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-zinc-600">Easing</span>
        <div className="flex gap-1">
          {EASINGS.map((easing) => (
            <button
              key={easing}
              type="button"
              onClick={() => onChange({ ...value, easing })}
              className={cn(
                'rounded-full px-3 py-1 text-xs capitalize transition-colors',
                value.easing === easing
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              )}
              aria-pressed={value.easing === easing}
            >
              {easing}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
