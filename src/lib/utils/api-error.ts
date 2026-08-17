import { NextResponse } from 'next/server';
import type { ApiErrorBody, ApiErrorCode } from '@/types/api';

/**
 * Standard error thrown by API routes. Convert to a response with
 * {@link toErrorResponse} at the route boundary.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function throwApiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): never {
  throw new ApiError(code, message, status, details);
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Converts any thrown value into the standard API error JSON response. */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (isApiError(error)) {
    const body: ApiErrorBody = {
      error: true,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
    return NextResponse.json(body, { status: error.status });
  }

  // Zod validation errors from schema.parse()
  if (error instanceof Error && error.name === 'ZodError') {
    const details = JSON.parse(error.message) as Record<string, unknown>;
    const body: ApiErrorBody = {
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  const body: ApiErrorBody = {
    error: true,
    code: 'INTERNAL_ERROR',
    message,
  };
  return NextResponse.json(body, { status: 500 });
}
