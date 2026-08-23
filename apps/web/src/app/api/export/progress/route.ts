import { NextRequest } from 'next/server';
import { exportQueue, type ExportJobResult } from '@/lib/queue';
import { createSSEStream } from '@/lib/utils/sse';
import { logger } from '@vdomake/logger';

export const dynamic = 'force-dynamic';

type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';

const STAGE_BY_STATE: Record<JobState, string> = {
  waiting: 'queued',
  delayed: 'queued',
  active: 'exporting',
  completed: 'complete',
  failed: 'failed',
  unknown: 'queued',
};

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

  const job = await exportQueue.getJob(jobId);
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

  const emit = (payload: Record<string, unknown>) => {
    send('progress', payload);
    if (payload.status === 'complete' || payload.status === 'failed') {
      done = true;
      if (pollTimer !== null) clearInterval(pollTimer);
      close();
    }
  };

  const poll = async () => {
    if (done) return;
    const fresh = await exportQueue.getJob(jobId).catch(() => null);
    if (fresh == null) {
      emit({ jobId, projectId: '', status: 'failed', progress: 0, error: 'Job no longer exists' });
      return;
    }
    const state = (await fresh.getState()) as JobState;
    const progress = typeof fresh.progress === 'number' ? fresh.progress : 0;
    const base = {
      jobId,
      projectId: (fresh.data as { projectId?: string }).projectId ?? '',
      status: STAGE_BY_STATE[state],
      progress,
    };

    if (state === 'completed') {
      const result = fresh.returnvalue as ExportJobResult | null;
      emit({
        ...base,
        status: 'complete',
        progress: 100,
        message: result ? `Exported ${result.exported} file(s)` : 'Export complete',
        urls: result?.urls ?? [],
      });
      return;
    }
    if (state === 'failed') {
      emit({ ...base, status: 'failed', error: fresh.failedReason ?? 'Export failed' });
      return;
    }
    emit(base);
  };

  void poll();
  pollTimer = setInterval(() => void poll(), 600);

  request.signal.addEventListener('abort', () => {
    if (pollTimer !== null) clearInterval(pollTimer);
    close();
  });

  logger.info({ jobId }, 'SSE progress stream opened for export job');
  return response;
}
