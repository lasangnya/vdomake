import { Worker, type Job } from 'bullmq';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { captures, projects } from '@/lib/db/schema';
import { redisConnection } from '@/lib/queue';
import { captureSite, frameFilename, type CaptureStage } from '@/lib/capture/capture-engine';
import { renderProject } from '@/lib/render/render-project';
import { previewFileUrl } from '@/lib/codegen/generate-service';
import { runExport, updateExport } from '@/lib/render/export-service';
import { logger } from '@vdomake/logger';
import type {
  CaptureJobData,
  CaptureJobResult,
  ExportJobData,
  ExportJobResult,
  RenderJobData,
  RenderJobResult,
} from './index';

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
  concurrency: 4,
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

// --- Render worker (Phase 4) ---

async function processRender(
  job: Job<RenderJobData>,
  _token: string | undefined,
  signal?: AbortSignal,
): Promise<RenderJobResult> {
  const { projectId } = job.data;
  logger.info({ projectId }, 'Render job started');
  await job.updateProgress(5);

  const result = await renderProject(
    projectId,
    { width: 1920, height: 1080, fps: 30 },
    (stage, current, total) => {
      const base = stage === 'rendering_frames' ? 15 : 85;
      const span = stage === 'rendering_frames' ? 65 : 10;
      const pct = total > 0 ? Math.round(base + (span * current) / total) : base;
      void job.updateProgress(pct);
    },
    signal,
  );

  await db
    .update(projects)
    .set({ previewUrl: previewFileUrl(projectId), status: 'done', updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await job.updateProgress(100);

  logger.info({ projectId, duration: result.duration }, 'Render job completed');
  return { projectId, outputPath: result.outputPath, duration: result.duration };
}

const renderWorker = new Worker('render', processRender, {
  connection: redisConnection,
  concurrency: 1,
});

renderWorker.on('failed', (job, error) => {
  const projectId = job?.data.projectId ?? 'unknown';
  logger.error({ projectId, error: error.message }, 'Render job failed');
  void db
    .update(projects)
    .set({ status: 'ready', updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .catch(() => undefined);
});

// --- Export worker (Phase 5) ---

async function processExport(job: Job<ExportJobData>): Promise<ExportJobResult> {
  const { projectId, exportIds, config } = job.data;
  logger.info({ projectId, exportIds }, 'Export job started');

  const urls: string[] = [];
  for (let i = 0; i < exportIds.length; i += 1) {
    const exportId = exportIds[i];
    const single = i === exportIds.length - 1;
    const perResolutionConfig = {
      ...config,
      resolution:
        config.mode === 'batch' && config.batchResolutions[i]
          ? config.batchResolutions[i]
          : config.resolution,
      mode: 'single' as const,
      batchResolutions: [],
    };
    try {
      const row = await runExport(exportId, projectId, perResolutionConfig, (progress) => {
        const overall = Math.round((i / exportIds.length) * 100 + progress / exportIds.length);
        void job.updateProgress(overall);
      });
      if (row.fileUrl) urls.push(row.fileUrl);
    } catch (error) {
      await updateExport(exportId, { status: 'failed', completedAt: new Date() });
      throw error;
    }
    void single;
  }

  await job.updateProgress(100);
  logger.info({ projectId, exported: urls.length }, 'Export job completed');
  return { projectId, exported: urls.length, urls };
}

const exportWorker = new Worker('export', processExport, {
  connection: redisConnection,
  concurrency: 1,
});

exportWorker.on('failed', (job, error) => {
  const projectId = job?.data.projectId ?? 'unknown';
  logger.error({ projectId, error: error.message }, 'Export job failed');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down workers');
  await Promise.all([captureWorker.close(), renderWorker.close(), exportWorker.close()]);
  await redisConnection.quit().catch(() => undefined);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info('Workers listening (capture, render, export)');
