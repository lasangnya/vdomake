'use client';

import { useEffect } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEventStream } from '@/lib/hooks/use-event-stream';

interface RenderEvent {
  status: string;
  progress: number;
  message?: string;
  error?: string;
  jobId?: string;
  projectId?: string;
}

export function RenderProgress({
  jobId,
  onComplete,
  onError,
}: {
  jobId: string;
  onComplete?: () => void;
  onError?: (message: string) => void;
}) {
  const { data, status } = useEventStream<RenderEvent>(`/api/generate/progress?jobId=${jobId}`);

  useEffect(() => {
    if (data?.status === 'complete') onComplete?.();
    if (data?.status === 'failed') onError?.(data.error ?? 'Render failed');
  }, [data, onComplete, onError]);

  const stage = data?.status ?? 'queued';
  const progress = data?.progress ?? 5;
  const label =
    stage === 'rendering_frames'
      ? 'Rendering frames…'
      : stage === 'encoding'
        ? 'Encoding video…'
        : stage === 'complete'
          ? 'Render complete'
          : stage === 'failed'
            ? 'Render failed'
            : 'Queued…';

  if (stage === 'complete' || stage === 'failed') {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {stage === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {label}
          </CardTitle>
          {data?.message && <CardDescription>{data.message}</CardDescription>}
          {data?.error && <CardDescription className="text-red-600">{data.error}</CardDescription>}
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          {label}
        </CardTitle>
        <CardDescription>
          {status === 'connecting' ? 'Connecting…' : (data?.message ?? 'Rendering your video…')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-2" />
        <p className="mt-2 font-mono text-xs text-zinc-500">{progress}%</p>
      </CardContent>
    </Card>
  );
}
