'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Phase {
  id: string;
  label: string;
  description: string;
}

export const PIPELINE_PHASES: Phase[] = [
  { id: 'capture', label: 'Capture', description: 'Screenshots & theme' },
  { id: 'storyboard', label: 'Storyboard', description: 'Scenes & transitions' },
  { id: 'voiceover', label: 'Voiceover', description: 'Audio & keyframes' },
  { id: 'generate', label: 'Generate', description: 'Code & render' },
  { id: 'export', label: 'Export', description: 'Timeline & output' },
];

export function PhaseStepper({
  currentPhase,
  onPhaseChange,
  compact = false,
}: {
  currentPhase: number;
  onPhaseChange?: (phase: number) => void;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Pipeline phases" className="flex flex-col gap-1">
      {PIPELINE_PHASES.map((phase, index) => {
        const isCurrent = index === currentPhase;
        const isComplete = index < currentPhase;
        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onPhaseChange?.(index)}
            disabled={!onPhaseChange}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
              isCurrent && 'bg-violet-50 text-violet-900',
              !isCurrent && 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              !onPhaseChange && 'cursor-default',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                isCurrent && 'bg-violet-600 text-white',
                isComplete && 'bg-emerald-100 text-emerald-700',
                !isCurrent && !isComplete && 'bg-zinc-200 text-zinc-600',
              )}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="flex flex-col">
              <span className={cn('text-sm font-medium', isCurrent && 'font-semibold')}>
                {phase.label}
              </span>
              {!compact && <span className="text-xs text-zinc-500">{phase.description}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
