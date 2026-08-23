'use client';

import { useEffect, useRef, useState } from 'react';

interface ExportProgressState {
  status: 'queued' | 'exporting' | 'complete' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  urls?: string[];
}

/** Live export progress via SSE on /api/export/progress?jobId=. */
export function ExportProgress({
  jobId,
  onComplete,
}: {
  jobId: string | null;
  onComplete?: (urls: string[]) => void;
}) {
  const [state, setState] = useState<ExportProgressState | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!jobId) {
      setState(null);
      return;
    }
    completedRef.current = false;
    const eventSource = new EventSource(`/api/export/progress?jobId=${encodeURIComponent(jobId)}`);
    const onMessage = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as ExportProgressState;
      setState(payload);
      if ((payload.status === 'complete' || payload.status === 'failed') && !completedRef.current) {
        completedRef.current = true;
        if (payload.status === 'complete') onComplete?.(payload.urls ?? []);
        eventSource.close();
      }
    };
    eventSource.addEventListener('progress', onMessage);
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [jobId, onComplete]);

  if (!jobId || !state) return null;

  const isDone = state.status === 'complete' || state.status === 'failed';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4" data-testid="export-progress">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-800">
          {state.status === 'failed'
            ? 'Export failed'
            : state.status === 'complete'
              ? 'Export complete'
              : 'Exporting…'}
        </span>
        <span className="font-mono text-xs text-zinc-500">{state.progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${state.progress}%` }}
        />
      </div>
      {state.message && <p className="mt-2 text-xs text-zinc-500">{state.message}</p>}
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {isDone && state.urls && state.urls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {state.urls.map((url) => (
            <a
              key={url}
              href={url}
              className="rounded-md bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
            >
              Download {url.split('/').pop()}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
