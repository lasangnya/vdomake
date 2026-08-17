import { Worker, type Job } from 'bullmq';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { captures, projects } from '@/lib/db/schema';
import { redisConnection } from '@/lib/queue';
import { captureSite, frameFilename, type CaptureStage } from '@/lib/capture/capture-engine';
import { logger } from '@vdomake/logger';
import type { CaptureJobData, CaptureJobResult } from './index';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const STAGE_WEIGHT: Record<CaptureStage, [number, number]> = {
  launching: [0, 5],
  connecting: [5, 10],
  scrolling: [10, 15],
  capturing: [15, 85],
  analyzing: [85, 98],
  complete: [98, 100],
};

function progressFor(stage: CaptureStage, current: number, total: number): number {
  const [start, end] = STAGE_WEIGHT[stage];
  if (total <= 0) return end;
  return Math.round(start + ((end - start) * Math.min(current, total)) / total);
}

async function processCapture(
  job: Job<CaptureJobData>,
  _token: string | undefined,
  signal?: AbortSignal,
): Promise<CaptureJobResult> {
  const { projectId, url, viewports, cookies } = job.data;
  logger.info({ projectId, url }, 'Capture job started');

  await job.updateProgress(progressFor('launching', 1, 1));
  const result = await captureSite(
    {
      url,
      viewports,
      cookies: cookies as
        Array<{ name: string; value: string; domain?: string; path?: string }> | undefined,
      signal,
    },
    (stage, current, total) => {
      void job.updateProgress(progressFor(stage, current, total));
    },
  );

  const dir = path.join(UPLOADS_ROOT, 'screenshots', projectId);
  await fs.mkdir(dir, { recursive: true });

  const savedFrames: CaptureJobResult['frames'] = [];
  for (const frame of result.frames) {
    const relativePath = frameFilename(projectId, frame.order);
    await fs.writeFile(path.join(UPLOADS_ROOT, relativePath), frame.buffer);
    const screenshotUrl = `/api/files/${relativePath.split(path.sep).join('/')}`;
    savedFrames.push({
      screenshotUrl,
      scrollPosition: frame.scrollPosition,
      order: frame.order,
      viewport: frame.viewport,
      metadata: frame.metadata,
    });
  }

  await db.delete(captures).where(eq(captures.projectId, projectId));
  if (savedFrames.length > 0) {
    await db.insert(captures).values(
      savedFrames.map((frame) => ({
        projectId,
        screenshotUrl: frame.screenshotUrl,
        scrollPosition: frame.scrollPosition,
        viewport: frame.viewport,
        order: frame.order,
        metadata: frame.metadata,
      })),
    );
  }

  await db
    .update(projects)
    .set({
      status: 'captured',
      themeManifest: result.manifest,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  await job.updateProgress(100);
  logger.info({ projectId, frames: savedFrames.length }, 'Capture job completed');

  return {
    projectId,
    pageTitle: result.pageTitle,
    finalUrl: result.finalUrl,
    manifest: result.manifest as unknown as Record<string, unknown>,
    frames: savedFrames,
  };
}

const captureWorker = new Worker('capture', processCapture, {
  connection: redisConnection,
  concurrency: 1,
});

captureWorker.on('failed', (job, error) => {
  const projectId = job?.data.projectId ?? 'unknown';
  logger.error({ projectId, error: error.message }, 'Capture job failed');
  void db
    .update(projects)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .catch((dbError) => logger.error({ dbError }, 'Failed to reset project status'));
});

captureWorker.on('error', (error) => {
  logger.error({ error: error.message }, 'Capture worker error');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down capture worker');
  await captureWorker.close();
  await redisConnection.quit().catch(() => undefined);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info('Capture worker listening on queue "capture"');
