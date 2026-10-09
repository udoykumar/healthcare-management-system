import "server-only";

import { auth } from "@/auth";
import { AppError } from "@/lib/api/errors";
import type { RoleKey } from "@/generated/prisma/enums";
import {
  loadAuthorizedUser,
  requirePermission,
  requireRole,
  requireUser,
  requireVerifiedEmail,
} from "@/lib/authz/session";
import type { AuthorizedUser, SessionUser } from "@/lib/api/errors";
import type { Permission } from "@/lib/authz/permissions";
import type { TenantScope } from "@/lib/db/tenant";

/**
 * Guards for route handlers.
 *
 * Server Components use the `requireX` helpers in `src/lib/authz/session.ts`
 * directly. Route handlers need the extra step of pulling the session out of the
 * request first, which is what `getRequestUser` does.
 *
 * Every protected route handler starts with one of these. This is the server-side
 * half of authorization — the half that actually matters, because it runs whether
 * or not the UI ever rendered a button.
 */

/** Resolves the caller, or throws 401. */
export async function requireRequestUser(): Promise<AuthorizedUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw AppError.unauthorized();
  }

  // Re-reads the user from the database. This is what makes blocking, deletion
  // and role changes take effect immediately rather than at token expiry.
  const user = await loadAuthorizedUser(session.user.id);

  return requireUser(user);
}

/** Resolves the caller, or returns null. For endpoints that are public. */
export async function getRequestUser(): Promise<AuthorizedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return loadAuthorizedUser(session.user.id);
}

/**
 * Route-handler guard combining a permission check with the tenant scope.
 *
 * Returns both the user and a ready-made scope, which is what stops a handler
 * from accidentally querying without a centre filter.
 */
export async function requireScopedUser(
  permission?: Permission | Permission[],
): Promise<{ user: AuthorizedUser; scope: TenantScope }> {
  const user = await requireRequestUser();

  const guarded = permission
    ? Array.isArray(permission)
      ? requireAny(user, ...permission)
      : requirePermission(user, permission)
    : user;

  return { user: guarded, scope: guarded.tenant };
}

/** Role guard for route handlers. */
export async function requireRequestRole(
  ...roles: RoleKey[]
): Promise<AuthorizedUser> {
  return requireRole(await requireRequestUser(), ...roles);
}

/** Permission guard for route handlers. */
export async function requireRequestPermission(
  permission: Permission,
): Promise<AuthorizedUser> {
  return requirePermission(await requireRequestUser(), permission);
}

/**
 * Clinical endpoints additionally require a verified email address.
 *
 * Reading or writing a medical record with an unverified address means a typo in
 * a signup form would go unnoticed on the one account where it matters.
 */
export async function requireClinicalUser(): Promise<AuthorizedUser> {
  return requireVerifiedEmail(await requireRequestUser());
}

/** True when the caller holds at least one of the permissions. Never throws. */
export async function requestCan(
  ...permissions: Permission[]
): Promise<boolean> {
  const user = await getRequestUser();
  if (!user || user.status !== "ACTIVE") return false;
  if (user.isSuperuser) return true;
  return permissions.some((p) => user.permissions.has(p));
}

// Imported here rather than at the top to keep the exported surface of this
// module small and obvious.
import { requireAnyPermission as requireAny } from "@/lib/authz/session";

export type { AuthorizedUser, SessionUser };