'use client';

import { useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEventStream } from '@/lib/hooks/use-event-stream';
import type { CaptureJob } from '@/types/api';
import type { CaptureJobResult } from '@/lib/queue';

export type CaptureStreamPayload = CaptureJob & { result?: CaptureJobResult };

const STAGE_LABEL: Record<CaptureJob['status'], string> = {
  queued: 'Queued',
  connecting: 'Connecting to site…',
  scrolling: 'Scrolling through the page…',
  capturing: 'Capturing high-DPI frames…',
  analyzing: 'Extracting theme…',
  complete: 'Capture complete',
  failed: 'Capture failed',
};

export function CaptureProgress({
  jobId,
  onComplete,
  onError,
}: {
  jobId: string;
  onComplete: (result: CaptureJobResult) => void;
  onError?: (message: string) => void;
}) {
  const { data, status, close } = useEventStream<CaptureStreamPayload>(
    `/api/capture/progress?jobId=${jobId}`,
  );

  useEffect(() => {
    if (data?.status === 'complete' && data.result) {
      onComplete(data.result);
      close();
    }
    if (data?.status === 'failed') {
      onError?.(data.error ?? 'Capture failed');
      close();
    }
  }, [data, onComplete, onError, close]);

  const progress = data?.progress ?? 5;
  const stage = data?.status ?? 'queued';

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
            {STAGE_LABEL[stage]}
          </CardTitle>
          {stage === 'complete' && data?.message && (
            <CardDescription>{data.message}</CardDescription>
          )}
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          {STAGE_LABEL[stage]}
        </CardTitle>
        <CardDescription>
          {status === 'connecting'
            ? 'Opening progress stream…'
            : (data?.message ?? 'Preparing capture…')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} className="h-2" />
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Monitor className="h-3.5 w-3.5" />
          {progress}% — screenshots are captured at 2× resolution for crisp video output
        </p>
      </CardContent>
    </Card>
  );
}
