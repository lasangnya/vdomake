import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { resolveUploadPath } from '@/lib/utils/uploads-path';
import { buildRouter } from '@/lib/trpc/context';
import { transcribeAudio, validateAudioFile } from '@/lib/audio/transcription';
import { autoSyncKeyframes, persistTrack } from '@/lib/audio/audio-service';
import { toErrorResponse, throwApiError } from '@/lib/utils/api-error';
import { logger } from '@vdomake/logger';

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

    // Save the file to uploads/audio/{projectId}/.
    const dir = resolveUploadPath(path.join('audio', projectId));
    await fs.mkdir(dir, { recursive: true });
    const filename = sanitizeFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);
    const fileUrl = `/api/files/audio/${projectId}/${filename}`;

    // Transcribe via the user's configured provider (Whisper or OpenAI-compatible).
    const providerRouter = await buildRouter();
    let transcript;
    try {
      const { result } = await providerRouter.transcribe(
        { audio: buffer, filename },
        'transcription',
      );
      transcript = result;
    } catch (error) {
      logger.warn(
        { projectId, error: (error as Error).message },
        'Transcription failed; saving track without transcript',
      );
      transcript = {
        text: '',
        language: 'unknown',
        duration: 0,
        segments: [],
      };
    }

    const track = await persistTrack(projectId, {
      fileUrl,
      duration: transcript.duration,
      transcript,
    });

    // Only auto-sync when a transcript exists.
    const suggestions = transcript.segments.length > 0 ? await autoSyncKeyframes(projectId) : [];

    return NextResponse.json({ error: false, data: { track, suggestions } }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
