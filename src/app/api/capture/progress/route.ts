import { NextRequest } from 'next/server';
import { captureQueue, type CaptureJobResult } from '@/lib/queue';
import { createSSEStream } from '@/lib/utils/sse';
import { logger } from '@/lib/utils/logger';
import type { CaptureJob } from '@/types/api';

export const dynamic = 'force-dynamic';

type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';

const STAGE_BY_STATE: Record<JobState, CaptureJob['status']> = {
  waiting: 'queued',
  delayed: 'queued',
  active: 'capturing',
  completed: 'complete',
  failed: 'failed',
  unknown: 'queued',
};

/**
 * Streams capture progress as Server-Sent Events. Progress is polled from the
 * BullMQ job at a fixed interval; the stream closes when the job completes
 * (emitting the final frame list + manifest) or fails.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return new Response(
      JSON.stringify({ error: true, code: 'VALIDATION_ERROR', message: 'jobId is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const job = await captureQueue.getJob(jobId);
  if (!job) {
    return new Response(
      JSON.stringify({ error: true, code: 'NOT_FOUND', message: 'Job not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { stream, send, close } = createSSEStream();
  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });

  let pollTimer: NodeJS.Timeout | null = null;
  let done = false;

  const emit = (jobStatus: CaptureJob) => {
    send('progress', jobStatus);
    if (jobStatus.status === 'complete' || jobStatus.status === 'failed') {
      done = true;
      if (pollTimer) clearInterval(pollTimer);
      send(jobStatus.status, jobStatus);
      close();
    }
  };

  const poll = async () => {
    if (done) return;
    const fresh = await captureQueue.getJob(jobId).catch(() => null);
    if (fresh == null) {
      emit({
        jobId,
        projectId: '',
        status: 'failed',
        progress: 0,
        error: 'Job no longer exists',
      });
      return;
    }
    const state = (await fresh.getState()) as JobState;
    const progress = typeof fresh.progress === 'number' ? fresh.progress : 0;
    const base: CaptureJob = {
      jobId,
      projectId: (fresh.data as { projectId?: string }).projectId ?? '',
      status: STAGE_BY_STATE[state],
      progress,
    };

    if (state === 'completed') {
      const result = fresh.returnvalue as CaptureJobResult | null;
      emit({
        ...base,
        status: 'complete',
        progress: 100,
        message: `${result?.frames.length ?? 0} frames captured`,
      });
      return;
    }
    if (state === 'failed') {
      emit({
        ...base,
        status: 'failed',
        error: fresh.failedReason ?? 'Capture failed',
      });
      return;
    }
    if (state === 'active') {
      const data = fresh.data as { url?: string };
      base.message = data.url ? `Capturing ${data.url}` : 'Capturing site';
    }
    emit(base);
  };

  void poll();
  pollTimer = setInterval(() => void poll(), 600);

  // Tear down the poller if the client disconnects.
  request.signal.addEventListener('abort', () => {
    if (pollTimer !== null) clearInterval(pollTimer);
    close();
  });

  logger.info({ jobId }, 'SSE progress stream opened for capture job');
  return response;
}
