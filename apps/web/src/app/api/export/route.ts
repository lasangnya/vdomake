import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { batchExportConfigSchema } from '@vdomake/validators';
import { createExportRecord } from '@/lib/render/export-service';
import { exportQueue, type ExportJobData } from '@/lib/queue';
import { toErrorResponse } from '@/lib/utils/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = z
      .object({ projectId: z.string().uuid(), config: batchExportConfigSchema })
      .parse(await request.json());
    const { projectId, config } = body;

    // Create export records for each requested resolution.
    const exportIds: string[] = [];
    const batchGroupId = config.mode === 'batch' ? `batch-${Date.now()}` : undefined;
    const resolutions = config.mode === 'batch' ? config.batchResolutions : [config.resolution];

    for (const resolution of resolutions) {
      const record = await createExportRecord({
        projectId,
        resolution,
        codec: config.codec,
        frameRate: config.frameRate,
        isBatch: config.mode === 'batch',
        batchGroupId,
      });
      exportIds.push(record.id);
    }

    const jobData: ExportJobData = {
      projectId,
      exportIds,
      config,
    };
    const job = await exportQueue.add('export', jobData, {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    return NextResponse.json(
      {
        error: false,
        data: {
          projectId,
          exportIds,
          jobId: job.id ?? '',
          progressUrl: `/api/export/progress?jobId=${job.id ?? ''}`,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
