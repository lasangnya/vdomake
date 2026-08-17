import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { taskRouting } from '@/lib/db/schema';
import { providerExists } from '@/lib/providers/provider-registry';
import { taskRoutingListSchema } from '@vdomake/validators';
import { toErrorResponse, throwApiError } from '@/lib/utils/api-error';
import type { TaskRoutingInput } from '@vdomake/validators';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.select().from(taskRouting);
    return NextResponse.json({ error: false, data: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const routes = taskRoutingListSchema.parse(await request.json());
    for (const route of routes) {
      if (!providerExists(route.primaryProviderId)) {
        throwApiError('VALIDATION_ERROR', `Unknown provider: ${route.primaryProviderId}`, 400);
      }
      if (route.fallbackProviderId && !providerExists(route.fallbackProviderId)) {
        throwApiError('VALIDATION_ERROR', `Unknown provider: ${route.fallbackProviderId}`, 400);
      }
    }

    // Upsert each routing rule by task type.
    for (const route of routes as TaskRoutingInput[]) {
      const existing = await db
        .select({ id: taskRouting.id })
        .from(taskRouting)
        .where(eq(taskRouting.taskType, route.taskType))
        .limit(1);

      const values = {
        primaryProviderId: route.primaryProviderId,
        primaryModel: route.primaryModel ?? null,
        fallbackProviderId: route.fallbackProviderId ?? null,
        fallbackModel: route.fallbackModel ?? null,
        updatedAt: new Date(),
      };
      if (existing.length > 0) {
        await db.update(taskRouting).set(values).where(eq(taskRouting.id, existing[0].id));
      } else {
        await db.insert(taskRouting).values({ taskType: route.taskType, ...values });
      }
    }

    const rows = await db.select().from(taskRouting);
    return NextResponse.json({ error: false, data: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}
