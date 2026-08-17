import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { providerKeys } from '@/lib/db/schema';
import { keyManager } from '@/lib/providers/key-manager';
import { getProvider, providerExists } from '@/lib/providers/provider-registry';
import { apiKeySchema } from '@/lib/validators/provider.schema';
import { toErrorResponse, throwApiError } from '@/lib/utils/api-error';
import { logger } from '@/lib/utils/logger';
import type { ProviderId } from '@/types/provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.select().from(providerKeys);
    return NextResponse.json({
      error: false,
      data: rows.map((row) => ({
        providerId: row.providerId,
        keyHint: row.keyHint,
        isValid: row.isValid,
        lastValidatedAt: row.lastValidatedAt,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = apiKeySchema.parse(await request.json());
    const provider = getProvider(body.providerId);

    logger.info({ providerId: body.providerId }, 'Validating provider key');
    const isValid = await provider.validateKey(body.apiKey);
    if (!isValid) {
      throwApiError('PROVIDER_ERROR', `Invalid API key for ${provider.name}`, 401);
    }

    const encrypted = keyManager.encrypt(body.apiKey);
    const existing = await db
      .select({ id: providerKeys.id })
      .from(providerKeys)
      .where(eq(providerKeys.providerId, body.providerId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(providerKeys)
        .set({
          encryptedKey: encrypted,
          keyHint: keyManager.hint(body.apiKey),
          isValid: true,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(providerKeys.id, existing[0].id));
    } else {
      await db.insert(providerKeys).values({
        providerId: body.providerId,
        encryptedKey: encrypted,
        keyHint: keyManager.hint(body.apiKey),
        isValid: true,
        lastValidatedAt: new Date(),
      });
    }

    return NextResponse.json(
      {
        error: false,
        data: { providerId: body.providerId, keyHint: keyManager.hint(body.apiKey), isValid: true },
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const providerId = request.nextUrl.searchParams.get('providerId');
    if (!providerId || !providerExists(providerId)) {
      throwApiError('VALIDATION_ERROR', 'Missing or unknown providerId', 400);
    }
    await db.delete(providerKeys).where(eq(providerKeys.providerId, providerId as ProviderId));
    return NextResponse.json({ error: false, data: { deleted: providerId } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
