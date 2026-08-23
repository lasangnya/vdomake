import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { backgroundMusic, projects } from '@/lib/db/schema';
import { resolveUploadPath } from '@/lib/utils/uploads-path';
import { validateAudioFile } from '@/lib/audio/transcription';
import { toErrorResponse, throwApiError } from '@/lib/utils/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}-${base}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const projectId = formData.get('projectId');
    const file = formData.get('file');

    if (typeof projectId !== 'string' || !z.string().uuid().safeParse(projectId).success) {
      throwApiError('VALIDATION_ERROR', 'projectId must be a valid UUID', 400);
    }
    if (!(file instanceof File)) {
      throwApiError('VALIDATION_ERROR', 'A file upload is required', 400);
    }
    const validation = validateAudioFile(file);
    if (!validation.ok) {
      throwApiError('VALIDATION_ERROR', validation.reason, 400);
    }
    const projectRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (projectRows.length === 0) {
      throwApiError('NOT_FOUND', 'Project not found', 404);
    }

    const dir = resolveUploadPath(path.join('music', projectId));
    await fs.mkdir(dir, { recursive: true });
    const filename = sanitizeFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);
    const fileUrl = `/api/files/music/${projectId}/${filename}`;

    await db.delete(backgroundMusic).where(eq(backgroundMusic.projectId, projectId));
    const inserted = await db
      .insert(backgroundMusic)
      .values({ projectId, fileUrl, duration: 0 })
      .returning();

    return NextResponse.json({ error: false, data: inserted[0] }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
