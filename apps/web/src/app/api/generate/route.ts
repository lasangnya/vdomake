import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { renderQueue, type RenderJobData } from '@/lib/queue';
import { toErrorResponse } from '@/lib/utils/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = z.object({ projectId: z.string().uuid() }).parse(await request.json());

    const jobData: RenderJobData = {
      projectId: body.projectId,
      exportId: `export-${body.projectId}`,
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      codec: 'h264',
    };
    const job = await renderQueue.add('render-video', jobData, {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    return NextResponse.json(
      {
        error: false,
        data: {
          projectId: body.projectId,
          jobId: job.id ?? '',
          progressUrl: `/api/generate/progress?jobId=${job.id ?? ''}`,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
