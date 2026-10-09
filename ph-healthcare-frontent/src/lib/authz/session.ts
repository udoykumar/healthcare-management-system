import "server-only";

import { cache } from "react";

import { RoleKey } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { AppError, type AuthorizedUser, type SessionUser } from "@/lib/api/errors";
import type { TenantScope } from "@/lib/db/tenant";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Session projection and server-side authorization.
 *
 * The critical property: every check here hits the database. A JWT is a signed
 * claim, not a live view of the account, so relying on the token alone would let
 * a blocked user or a demoted admin keep working until their token expired.
 * `requireUser` re-reads status, role, and permissions on every call, so a block
 * or a role change takes effect on the very next request.
 */

/** The exact select used everywhere a User row is read. Keep it the only one. */
const SESSION_USER_SELECT = {
  id: true,
  code: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  passwordHash: true,
  status: true,
  isDeleted: true,
  mustChangePassword: true,
  sessionVersion: true,
  emailVerified: true,
  lastLoginAt: true,
  healthcareCenterId: true,
  role: { select: { key: true, isSuperuser: true } },
  healthcareCenter: {
    select: { name: true, timezone: true, currency: true },
  },
  patient: { select: { id: true } },
  doctor: { select: { id: true } },
  staff: { select: { id: true } },
} satisfies Prisma.UserSelect;

type SessionUserRow = Prisma.UserGetPayload<{ select: typeof SESSION_USER_SELECT }>;

/**
 * Projects a User row onto the public shape, dropping every server-only field.
 * Exported separately so server actions can reuse it.
 */
export function toSessionUser(row: SessionUserRow): SessionUser {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    image: row.image,
    role: row.role?.key ?? RoleKey.PATIENT,
    status: row.status,
    healthcareCenterId: row.healthcareCenterId,
    healthcareCenterName: row.healthcareCenter?.name ?? null,
    healthcareCenterTimezone: row.healthcareCenter?.timezone ?? null,
    healthcareCenterCurrency: row.healthcareCenter?.currency ?? null,
    emailVerified: row.emailVerified !== null,
    mustChangePassword: row.mustChangePassword,
    doctorId: row.doctor?.id ?? null,
    patientId: row.patient?.id ?? null,
    staffId: row.staff?.id ?? null,
    lastLoginAt: row.lastLoginAt,
  };
}

export function toTenantScope(user: SessionUser): TenantScope {
  return {
    role: user.role,
    healthcareCenterId: user.healthcareCenterId,
    doctorId: user.doctorId,
    patientId: user.patientId,
  };
}

/**
 * Loads a user with their resolved permissions.
 *
 * Wrapped in React's `cache` so that several guards called during one render
 * (layout + page + sidebar) share a single query.
 */
export const loadAuthorizedUser = cache(
  async (userId: string): Promise<AuthorizedUser | null> => {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...SESSION_USER_SELECT,
        role: {
          select: {
            key: true,
            isSuperuser: true,
            rolePermissions: { select: { permission: { select: { code: true } } } },
          },
        },
      },
    });

    if (!row || row.isDeleted) return null;

    const isSuperuser = row.role?.isSuperuser ?? false;

    const permissions = new Set(
      isSuperuser
        ? []
        : (row.role?.rolePermissions ?? []).map((rp) => rp.permission.code),
    );

    return {
      ...toSessionUser(row),
      permissions,
      isSuperuser,
      tenant: toTenantScope(toSessionUser(row)),
    };
  },
);

/** Guards that any signed-in, active account may pass. */
export function requireUser(user: AuthorizedUser | null): AuthorizedUser {
  if (!user) {
    throw AppError.unauthorized();
  }

  if (user.status === "BLOCKED" || user.status === "DELETED") {
    throw AppError.forbidden(
      "Your account has been suspended. Contact your administrator.",
      "ACCOUNT_SUSPENDED",
    );
  }

  if (user.status === "INACTIVE") {
    throw AppError.forbidden("Your account is inactive.", "ACCOUNT_INACTIVE");
  }

  return user;
}

/** Guards for a specific set of roles. */
export function requireRole(
  user: AuthorizedUser | null,
  ...roles: RoleKey[]
): AuthorizedUser {
  const authed = requireUser(user);

  if (!roles.includes(authed.role)) {
    throw AppError.forbidden(
      "This area is restricted to a different role.",
      "ROLE_REQUIRED",
    );
  }

  return authed;
}

/** Guards on a single permission code. */
export function requirePermission(
  user: AuthorizedUser | null,
  permission: string,
): AuthorizedUser {
  const authed = requireUser(user);

  if (authed.isSuperuser) return authed;
  if (authed.permissions.has(permission)) return authed;

  throw AppError.forbidden(
    "You do not have permission to do that.",
    "PERMISSION_REQUIRED",
  );
}

/** Guards on any one of several permissions. */
export function requireAnyPermission(
  user: AuthorizedUser | null,
  ...permissions: string[]
): AuthorizedUser {
  const authed = requireUser(user);

  if (authed.isSuperuser) return authed;
  if (permissions.some((p) => authed.permissions.has(p))) return authed;

  throw AppError.forbidden(
    "You do not have permission to do that.",
    "PERMISSION_REQUIRED",
  );
}

/**
 * Non-throwing check, for deciding whether to render a control.
 *
 * This is a UX affordance only. Hiding a button is not authorization — the
 * corresponding server action or route handler must call `requirePermission`
 * itself, because anything the client receives can be forged.
 */
export function can(
  user: AuthorizedUser | null,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.status !== "ACTIVE") return false;
  if (user.isSuperuser) return true;
  return user.permissions.has(permission);
}

export function canAny(
  user: AuthorizedUser | null,
  ...permissions: string[]
): boolean {
  return permissions.some((p) => can(user, p));
}

export function hasRole(
  user: AuthorizedUser | null,
  ...roles: RoleKey[]
): boolean {
  return user !== null && roles.includes(user.role);
}

/**
 * Requires the account to have completed email verification.
 *
 * Sign-in is allowed with an unverified email — otherwise a user who never
 * received the verification mail can never get back in — but anything that
 * touches clinical data requires a verified address.
 */
export function requireVerifiedEmail(user: AuthorizedUser | null): AuthorizedUser {
  const authed = requireUser(user);

  if (!authed.emailVerified) {
    throw AppError.forbidden(
      "Please verify your email address to continue.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  return authed;
}

/**
 * Requires the account to have changed its temporary password.
 * Used to bounce a user to /change-password after an admin creates them.
 */
export function requirePasswordChanged(user: AuthorizedUser | null): AuthorizedUser {
  const authed = requireUser(user);

  if (authed.mustChangePassword) {
    throw AppError.forbidden(
      "You must change your temporary password before continuing.",
      "PASSWORD_CHANGE_REQUIRED",
    );
  }

  return authed;
}