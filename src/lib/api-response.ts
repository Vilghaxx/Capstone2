import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard success response — builds a JSON NextResponse with the given data.
 */
export function jsonResponse<TData>(data: TData, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Standard error response — builds a JSON NextResponse with an error payload.
 */
export function errorResponse(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Unauthorized (401) response.
 */
export function unauthorized(message = "Authentication required") {
  return errorResponse(message, 401);
}

/**
 * Forbidden (403) response.
 */
export function forbidden(message = "Insufficient permissions") {
  return errorResponse(message, 403);
}

/**
 * Not found (404) response.
 */
export function notFound(message = "Resource not found") {
  return errorResponse(message, 404);
}

/**
 * Handle a Zod validation error and return a 400 with field details.
 */
export function handleZodError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        field: issue.path.join(".") || "_",
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Wrap an async route handler so any thrown error becomes a clean JSON
 * response instead of an HTML 500 page.
 */
export function withErrors<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[API ERROR]", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return errorResponse(message, 500);
    }
  };
}
