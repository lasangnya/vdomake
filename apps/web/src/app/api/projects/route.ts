import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { captures, projects } from '@/lib/db/schema';
import { urlInputSchema } from '@vdomake/validators';
import { toErrorResponse } from '@/lib/utils/api-error';

export const dynamic = 'force-dynamic';

function projectNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Untitled project';
  }
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        url: projects.url,
        status: projects.status,
        themeManifest: projects.themeManifest,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        captureCount: db.$count(captures, eq(captures.projectId, projects.id)),
      })
      .from(projects)
      .orderBy(desc(projects.updatedAt));
    return NextResponse.json({ error: false, data: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = urlInputSchema.pick({ url: true }).parse(await request.json());
    const created = await db
      .insert(projects)
      .values({
        name: projectNameFromUrl(body.url),
        url: body.url,
        status: 'draft',
      })
      .returning();
    return NextResponse.json({ error: false, data: created[0] }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
