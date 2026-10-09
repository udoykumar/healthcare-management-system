import "server-only";

import type { RoleKey } from "@/generated/prisma/enums";
import type { UserStatus } from "@/generated/prisma/enums";
import type { TenantScope } from "@/lib/db/tenant";

/**
 * The user shape the application is allowed to see.
 *
 * Note what is absent: `passwordHash`, `sessionVersion`, `lockedUntil`,
 * `failedLoginCount`, `mustChangePassword`. This interface is what server
 * components and API responses are built from, so a field that should never leave
 * the server is one that does not have a slot here. See
 * `toSessionUser` in `src/lib/authz/session.ts` — it is the only place a User row
 * is projected down to this.
 */
export interface SessionUser {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: RoleKey;
  status: UserStatus;

  /** null only for SUPERADMIN. */
  healthcareCenterId: string | null;
  healthcareCenterName: string | null;
  healthcareCenterTimezone: string | null;
  healthcareCenterCurrency: string | null;

  emailVerified: boolean;
  mustChangePassword: boolean;

  /** Populated for DOCTOR. */
  doctorId: string | null;
  /** Populated for PATIENT. */
  patientId: string | null;
  /** Populated for staff. */
  staffId: string | null;

  lastLoginAt: Date | null;
}

/** A SessionUser plus the permissions resolved for it. */
export interface AuthorizedUser extends SessionUser {
  permissions: ReadonlySet<string>;
  /** True when the role bypasses permission checks entirely. */
  isSuperuser: boolean;
  /** The tenant scope to hand to services, so they cannot widen it themselves. */
  tenant: TenantScope;
}

/**
 * Thrown when authentication or authorization fails.
 *
 * `status` is what the API layer turns into an HTTP code; `code` is the stable
 * machine-readable identifier clients switch on. The `message` is written to be
 * shown to a user — it never contains internals.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static unauthorized(
    message = "You must be signed in to do that.",
    code = "UNAUTHENTICATED",
  ): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(
    message = "You do not have permission to do that.",
    code = "FORBIDDEN",
  ): AppError {
    return new AppError(403, code, message);
  }

  static notFound(
    message = "The requested record was not found.",
    code = "NOT_FOUND",
  ): AppError {
    return new AppError(404, code, message);
  }

  static conflict(
    message = "That record already exists.",
    code = "CONFLICT",
  ): AppError {
    return new AppError(409, code, message);
  }

  static unprocessable(
    message: string,
    details?: unknown,
    code = "VALIDATION_FAILED",
  ): AppError {
    return new AppError(422, code, message, details);
  }

  static tooManyRequests(
    message = "Too many requests. Please slow down and try again shortly.",
    retryAfterSeconds?: number,
  ): AppError {
    return new AppError(
      429,
      "RATE_LIMITED",
      message,
      retryAfterSeconds === undefined ? undefined : { retryAfterSeconds },
    );
  }

  static locked(message = "Too many failed attempts. Try again later."): AppError {
    return new AppError(423, "ACCOUNT_LOCKED", message);
  }

  /**
   * 400 for a malformed or already-spent verification/reset link.
   *
   * Kept identical for every failure mode of that flow — unknown token, wrong
   * purpose, already used, expired — so the response cannot be used to probe
   * which tokens exist.
   */
  static badRequestLink(
    message = "This link is invalid or has expired. Please request a new one.",
  ): AppError {
    return new AppError(400, "INVALID_TOKEN", message);
  }
}