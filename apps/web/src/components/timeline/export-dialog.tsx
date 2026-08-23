'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: '4K', width: 3840, height: 2160 },
] as const;

export interface ExportConfigValue {
  mode: 'single' | 'batch';
  format: 'video' | 'project';
  codec: 'h264' | 'webm';
  resolution: { width: number; height: number };
  frameRate: number;
  batchResolutions: Array<{ width: number; height: number }>;
}

export function ExportDialog({
  open,
  onClose,
  onStart,
  durationSec,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (config: ExportConfigValue) => void;
  durationSec: number;
}) {
  const [resolutionIdx, setResolutionIdx] = useState(1);
  const [format, setFormat] = useState<'video' | 'project'>('video');
  const [codec, setCodec] = useState<'h264' | 'webm'>('h264');
  const [frameRate, setFrameRate] = useState(30);
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  const estimate = useMemo(() => {
    // ~2.5 Mbps for 1080p30 h264; scale by pixels and fps.
    const selected = PRESETS[resolutionIdx];
    const baseMbps =
      ((2.5 * (selected.width * selected.height)) / (1920 * 1080)) * (frameRate / 30);
    const mb = (baseMbps / 8) * Math.max(durationSec, 0.1);
    return mb.toFixed(0);
  }, [resolutionIdx, frameRate, durationSec]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const start = () => {
    const selected = PRESETS[resolutionIdx];
    onStart({
      mode,
      format,
      codec,
      resolution: { width: selected.width, height: selected.height },
      frameRate,
      batchResolutions:
        mode === 'batch' ? PRESETS.map((p) => ({ width: p.width, height: p.height })) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
        data-testid="export-dialog"
      >
        <h2 className="text-lg font-semibold text-zinc-900">Export</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Re-renders the timeline at your chosen settings. Duration {durationSec.toFixed(1)}s.
        </p>

        {/* Mode */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
          {(['single', 'batch'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md py-1.5 text-sm',
                mode === m ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-500',
              )}
              type="button"
            >
              {m === 'single' ? 'Single' : 'Batch (all resolutions)'}
            </button>
          ))}
        </div>

        {/* Resolution */}
        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-zinc-600">Resolution</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setResolutionIdx(i)}
                className={cn(
                  'rounded-lg border py-2 text-sm',
                  resolutionIdx === i
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Format + codec */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="export-format" className="text-xs font-medium text-zinc-600">
              Format
            </label>
            <select
              id="export-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'video' | 'project')}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="video">Video</option>
              <option value="project">Motion Canvas project (zip)</option>
            </select>
          </div>
          <div>
            <label htmlFor="export-codec" className="text-xs font-medium text-zinc-600">
              Codec
            </label>
            <select
              id="export-codec"
              value={codec}
              onChange={(e) => setCodec(e.target.value as 'h264' | 'webm')}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="h264">H.264 (MP4)</option>
              <option value="webm">WebM</option>
            </select>
          </div>
        </div>

        {/* Frame rate */}
        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-zinc-600">Frame rate</legend>
          <div className="mt-1 flex gap-1 rounded-lg bg-zinc-100 p-1">
            {[24, 30, 60].map((fps) => (
              <button
                key={fps}
                type="button"
                onClick={() => setFrameRate(fps)}
                className={cn(
                  'flex-1 rounded-md py-1 text-sm',
                  frameRate === fps
                    ? 'bg-white font-medium text-zinc-900 shadow-sm'
                    : 'text-zinc-500',
                )}
              >
                {fps} fps
              </button>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 text-xs text-zinc-500">
          Estimated file size: <span className="font-semibold text-zinc-700">{estimate} MB</span>
          {mode === 'batch' && ' × 3 resolutions'}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={start}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            data-testid="export-start"
            type="button"
          >
            Start export
          </button>
        </div>
      </div>
    </div>
  );
}
