import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { toErrorResponse, throwApiError } from '@/lib/utils/api-error';

export const dynamic = 'force-dynamic';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/**
 * Serves files from the local uploads directory. The path is resolved against
 * UPLOADS_ROOT and must stay inside it — path traversal is rejected.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const segments = (await params).path;
    if (!segments.length) {
      throwApiError('NOT_FOUND', 'No file path provided', 404);
    }

    const relative = segments.join(path.sep);
    const resolved = path.resolve(UPLOADS_ROOT, relative);
    if (!resolved.startsWith(`${UPLOADS_ROOT}${path.sep}`) && resolved !== UPLOADS_ROOT) {
      throwApiError('NOT_FOUND', 'File not found', 404);
    }

    const data = await fs.readFile(resolved).catch(() => null);
    if (data === null) {
      throwApiError('NOT_FOUND', 'File not found', 404);
    }

    const contentType =
      CONTENT_TYPES[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
