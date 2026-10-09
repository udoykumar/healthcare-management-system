import { RoleKey } from "@/generated/prisma/enums";

/**
 * Tenant scoping.
 *
 * Multi-tenancy rule (§36): a request must never be able to read or write another
 * healthcare centre's rows. Rather than trusting each query to remember its
 * centre, every service builds its `where` clause through `scopeToCenter`.
 *
 * SUPERADMIN has `healthcareCenterId === null`, which means "platform-level, no
 * tenant restriction". For every other role the id is mandatory, and
 * `assertTenantAccess` refuses a mismatch outright.
 */

/** A tenant scope as produced by the session layer. */
export type TenantScope = {
  role: RoleKey;
  /** null only for SUPERADMIN. */
  healthcareCenterId: string | null;
  /** Set for DOCTOR and PATIENT. */
  doctorId?: string | null;
  patientId?: string | null;
};

export class CrossTenantError extends Error {
  constructor(message = "You do not have access to this healthcare center.") {
    super(message);
    this.name = "CrossTenantError";
  }
}

/**
 * Builds the tenant part of a Prisma `where` clause.
 *
 * Returns an unconstrained `{}` for SUPERADMIN, which is the only role allowed to
 * span centres. Every other role is pinned to its own centre.
 */
export function scopeToCenter<T extends Record<string, unknown>>(
  scope: TenantScope,
  where?: T,
): T & { healthcareCenterId?: string } {
  const base = (where ?? {}) as T & { healthcareCenterId?: string };

  if (scope.role === RoleKey.SUPERADMIN) {
    return base;
  }

  if (!scope.healthcareCenterId) {
    // A non-superadmin without a centre is a broken session, not an unscoped one.
    // Failing closed here is the whole point of the helper.
    throw new CrossTenantError("Your account is not assigned to a healthcare center.");
  }

  return { ...base, healthcareCenterId: scope.healthcareCenterId };
}

/**
 * Fails unless `requestedCenterId` is the caller's own centre, or the caller is a
 * superadmin. Use before acting on an id that came from the URL.
 */
export function assertTenantAccess(
  scope: TenantScope,
  requestedCenterId: string | null | undefined,
): void {
  if (scope.role === RoleKey.SUPERADMIN) return;
  if (!scope.healthcareCenterId || requestedCenterId !== scope.healthcareCenterId) {
    throw new CrossTenantError();
  }
}

/**
 * Confirms a doctor or patient row belongs to the caller's centre. Used when the
 * id is embedded in a path and the tenant filter alone would already exclude the
 * row — this turns "not found" into an explicit "belongs to another centre".
 */
export function assertSameCenter(
  scope: TenantScope,
  entityCenterId: string,
): void {
  assertTenantAccess(scope, entityCenterId);
}

/**
 * Soft-delete predicate for `User`.
 *
 * Only `User` and `MedicalDocument` carry an `isDeleted` flag. Every other
 * catalogue-like table (Patient, Doctor, Staff, Department, Service, Medicine,
 * LaboratoryTest) uses `status: RecordStatus` instead — a "retired" row, not a
 * deleted one. Spreading this into one of those queries produces an
 * `Unknown argument` Prisma error at runtime rather than a compile error, so the
 * name is deliberately specific.
 */
export const USER_NOT_DELETED = { isDeleted: false } as const;

/**
 * The same idea for the models that use RecordStatus.
 *
 * `INACTIVE` rows are excluded from listings and counts, but are never deleted:
 * a patient who left the clinic still has appointments and invoices attached.
 */
export const RECORD_ACTIVE = { status: "ACTIVE" } as const;

export function pageParams(page: number, pageSize: number) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(200, Math.max(1, Math.floor(pageSize)));
  return {
    page: safePage,
    pageSize: safeSize,
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  };
}