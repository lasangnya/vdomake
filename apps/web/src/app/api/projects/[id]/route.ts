import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { captures, projects } from '@/lib/db/schema';
import { toErrorResponse, throwApiError } from '@/lib/utils/api-error';
import type { ProjectStatus } from '@/types/project';

const VALID_STATUSES: ProjectStatus[] = [
  'draft',
  'capturing',
  'captured',
  'storyboarding',
  'ready',
  'exporting',
  'done',
];

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (project.length === 0) {
      throwApiError('NOT_FOUND', 'Project not found', 404);
    }
    const frames = await db
      .select()
      .from(captures)
      .where(eq(captures.projectId, id))
      .orderBy(asc(captures.order));
    return NextResponse.json({ error: false, data: { ...project[0], captures: frames } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: ProjectStatus };
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      throwApiError('VALIDATION_ERROR', `Invalid status: ${body.status}`, 400);
    }
    const updated = await db
      .update(projects)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    if (updated.length === 0) {
      throwApiError('NOT_FOUND', 'Project not found', 404);
    }
    return NextResponse.json({ error: false, data: updated[0] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
