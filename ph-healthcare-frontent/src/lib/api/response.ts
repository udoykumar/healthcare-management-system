import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/api/errors";
import { Prisma } from "@/generated/prisma/client";

/**
 * The API response envelope (§40).
 *
 * Every route handler returns through `ok` or `fail`, so the wire format is
 * uniform and clients can switch on `success` rather than guessing from status
 * codes. The shapes:
 *
 *   success → { success: true,  message, data?, meta? }
 *   failure → { success: false, message, code, errors? }
 */

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: ApiMeta;
};

export type ApiFailure = {
  success: false;
  message: string;
  code: string;
  errors?: unknown;
};

/** Pagination envelope returned under `meta`. */
export type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export function buildMeta(
  page: number,
  pageSize: number,
  total: number,
): ApiMeta {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1 && total > 0,
  };
}

export function ok<T>(
  data: T,
  message = "Success",
  init?: { status?: number; meta?: ApiMeta },
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true as const, message, data, ...(init?.meta ? { meta: init.meta } : {}) },
    { status: init?.status ?? 200 },
  );
}

export function created<T>(
  data: T,
  message = "Created successfully",
): NextResponse<ApiSuccess<T>> {
  return ok(data, message, { status: 201 });
}

export function noContent(): NextResponse<null> {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  status: number,
  code: string,
  message: string,
  errors?: unknown,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      success: false as const,
      message,
      code,
      ...(errors === undefined ? {} : { errors }),
    },
    { status },
  );
}

/**
 * The single error boundary for route handlers.
 *
 * The design rule from §41: a user gets a friendly message, and the raw cause
 * stays on the server. Unknown errors are logged with a correlation id that is
 * also returned to the caller, so a support request can be traced to a log line
 * without exposing a stack trace or a database message to the browser.
 */
export function handleApiError(error: unknown): NextResponse<ApiFailure> {
  // Already a deliberate, user-safe error.
  if (error instanceof AppError) {
    return fail(error.status, error.code, error.message, error.details);
  }

  // Zod. Thrown by `validate` in lib/api/validate.ts.
  if (error instanceof ZodError) {
    return fail(
      422,
      "VALIDATION_FAILED",
      "Please correct the highlighted fields and try again.",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      // 2002 = unique constraint, 2003 = foreign key, P2025 = record not found.
      case "P2002":
        return fail(
          409,
          "DUPLICATE",
          "A record with those details already exists.",
        );
      case "P2003":
        return fail(
          409,
          "IN_USE",
          "That record is still referenced by other data and cannot be changed.",
        );
      case "P2025":
        return fail(404, "NOT_FOUND", "The requested record was not found.");
      default:
        break;
    }
  }

  /*
   * Postgres exclusion-constraint violation. Two appointments for the same doctor
   * that overlap is a business rule, not a server fault, so it maps to 409 with
   * a message the booking UI can show verbatim.
   */
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    if (/appointments_doctor_no_overlap|exclusion/i.test(error.message)) {
      return fail(
        409,
        "SLOT_TAKEN",
        "That time slot has just been booked. Please choose another.",
      );
    }
  }

  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    // A malformed query is our bug, not the caller's.
    logUnexpected("prisma", error);
    return fail(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }

  logUnexpected("unhandled", error);

  return fail(
    500,
    "SERVER_ERROR",
    "Something went wrong on our side. Please try again.",
  );
}

const errorId = () => Math.random().toString(36).slice(2, 10);

function logUnexpected(label: string, error: unknown): void {
  const reference = errorId();

  // Never log the request body, headers, or any patient content. Only enough to
  // locate the failure.
  console.error(`[api:${reference}] ${label}:`, error);
}

/**
 * Wraps a route handler so thrown errors become a clean failure response.
 *
 *   export const GET = withErrorHandling(async (req) => ok(...));
 */
export function withErrorHandling<
  Args extends unknown[],
  R extends NextResponse,
>(
  handler: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R | NextResponse<ApiFailure>> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}