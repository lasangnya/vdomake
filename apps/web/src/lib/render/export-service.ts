import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exportsTable } from '@/lib/db/schema';
import { renderProject } from './render-project';
import { zipDirectory, directorySizeBytes } from './project-packager';
import { MOTION_CANVAS_ROOT, exportsDir } from '@/lib/codegen/generate-service';
import type { ExportConfig } from '@vdomake/validators';
import type { ExportRow } from '@/lib/db/schema';

export interface ExportRecordInput {
  projectId: string;
  resolution: { width: number; height: number };
  codec: 'h264' | 'webm';
  frameRate: number;
  isBatch: boolean;
  batchGroupId?: string;
}

export async function createExportRecord(input: ExportRecordInput): Promise<ExportRow> {
  const label = `${input.resolution.width}x${input.resolution.height}`;
  const inserted = await db
    .insert(exportsTable)
    .values({
      projectId: input.projectId,
      resolution: label,
      format: 'video',
      codec: input.codec,
      frameRate: input.frameRate,
      status: 'queued',
      isBatch: input.isBatch,
      batchGroupId: input.batchGroupId ?? null,
    })
    .returning();
  return inserted[0];
}

export async function updateExport(
  exportId: string,
  patch: Partial<{
    status: string;
    progress: number;
    fileUrl: string;
    fileSize: number;
    startedAt: Date;
    completedAt: Date;
  }>,
): Promise<void> {
  await db.update(exportsTable).set(patch).where(eq(exportsTable.id, exportId));
}

export function exportOutputDir(projectId: string, exportId: string): string {
  return path.join(exportsDir(projectId), exportId);
}

export function exportFileUrl(projectId: string, exportId: string, codec: string): string {
  const ext = codec === 'webm' ? 'webm' : 'mp4';
  return `/api/files/exports/${projectId}/${exportId}/export.${ext}`;
}

/**
 * Runs a single export: renders at the configured resolution, records the
 * result, and optionally zips the generated Motion Canvas project.
 */
export async function runExport(
  exportId: string,
  projectId: string,
  config: ExportConfig,
  onProgress?: (progress: number) => void,
): Promise<ExportRow> {
  await updateExport(exportId, { status: 'rendering', startedAt: new Date(), progress: 5 });

  const render = await renderProject(
    projectId,
    { width: config.resolution.width, height: config.resolution.height, fps: config.frameRate },
    (_stage, current, total) => {
      const pct = total > 0 ? Math.round(15 + (75 * current) / total) : 15;
      void updateExport(exportId, { progress: pct });
      onProgress?.(pct);
    },
  );

  if (config.format === 'project') {
    // Package the generated Motion Canvas project as a zip.
    const zipPath = path.join(exportOutputDir(projectId, exportId), 'project.zip');
    const mcDir = path.join(MOTION_CANVAS_ROOT, projectId);
    await zipDirectory(mcDir, zipPath);
    const size = await directorySizeBytes(exportOutputDir(projectId, exportId));
    await updateExport(exportId, {
      status: 'complete',
      progress: 100,
      fileUrl: `/api/files/exports/${projectId}/${exportId}/project.zip`,
      fileSize: size,
      completedAt: new Date(),
    });
  } else {
    const ext = config.codec === 'webm' ? 'webm' : 'mp4';
    const finalPath = path.join(exportOutputDir(projectId, exportId), `export.${ext}`);
    await fs.rename(render.outputPath, finalPath).catch(() => undefined);
    const stat = await fs.stat(finalPath).catch(() => ({ size: 0 }));
    await updateExport(exportId, {
      status: 'complete',
      progress: 100,
      fileUrl: exportFileUrl(projectId, exportId, config.codec),
      fileSize: stat.size,
      completedAt: new Date(),
    });
  }

  const rows = await db.select().from(exportsTable).where(eq(exportsTable.id, exportId));
  return rows[0];
}
