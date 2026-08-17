import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, type ProjectRow } from '@/lib/db/schema';
import { captureQueue, type CaptureJobData } from '@/lib/queue';
import { urlInputSchema } from '@/lib/validators/url-input.schema';
import { toErrorResponse } from '@/lib/utils/api-error';

export const dynamic = 'force-dynamic';

function projectNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Untitled project';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = urlInputSchema.parse(await request.json());
    const viewports = body.viewports ?? [
      { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
    ];

    let project: ProjectRow;
    const existing = await db
      .select()
      .from(projects)
      .where(sql`url = ${body.url} AND status = 'draft'`)
      .limit(1);

    // Reuse a previous draft of the same URL when present; otherwise create one.
    if (existing.length > 0) {
      project = existing[0];
      await db
        .update(projects)
        .set({ status: 'capturing', updatedAt: new Date() })
        .where(eq(projects.id, existing[0].id));
    } else {
      const created = await db
        .insert(projects)
        .values({
          name: projectNameFromUrl(body.url),
          url: body.url,
          status: 'capturing',
        })
        .returning();
      project = created[0];
    }

    const jobData: CaptureJobData = {
      projectId: project.id,
      url: body.url,
      viewports,
      cookies: body.cookies as CaptureJobData['cookies'],
    };
    const job = await captureQueue.add('capture-site', jobData, {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    return NextResponse.json(
      {
        error: false,
        data: {
          projectId: project.id,
          jobId: job.id ?? '',
          progressUrl: `/api/capture/progress?jobId=${job.id ?? ''}`,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
