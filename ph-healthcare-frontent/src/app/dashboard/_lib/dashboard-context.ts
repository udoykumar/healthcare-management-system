import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RoleKey } from "@/generated/prisma/enums";
import { loadAuthorizedUser, requireUser } from "@/lib/authz/session";
import { ROLE_HOME } from "@/config/navigation";

/**
 * Server-side helpers shared by the four role dashboards.
 *
 * Server Components call these directly. There is intentionally no client-side
 * equivalent: the role is resolved from the database on the server, and letting the
 * browser re-decide it would create a second, forgeable source of truth.
 */

export type DashboardUser = NonNullable<Awaited<ReturnType<typeof loadAuthorizedUser>>>;

/**
 * Resolves the signed-in user for a dashboard section and refuses the request when
 * the role is not allowed.
 *
 * This is the layout-level half of authorization. It keeps a user out of another
 * role's dashboard entirely. It is *not* the only check: each page below calls
 * `requirePermission` for its own data, so a direct request to a page is
 * independently protected even if this layout were bypassed.
 */
export async function requireDashboardContext(
  allowed: RoleKey[],
): Promise<{ user: DashboardUser }> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = requireUser(await loadAuthorizedUser(session.user.id));

  if (!allowed.includes(user.role)) {
    /*
     * Send them somewhere they can actually use rather than rendering a dead end.
     * The destination page runs its own permission checks, so this cannot be used
     * to reach data they lack access to.
     */
    redirect(ROLE_HOME[user.role]);
  }

  /*
   * A freshly invited account carries a temporary password. Blocking the whole
   * dashboard until it is changed is the entire point of the flag — otherwise the
   * account is live while the previous holder still knows the credentials.
   */
  if (user.mustChangePassword) {
    redirect("/change-password?required=true");
  }

  return { user };
}

/**
 * Runs a dashboard count and returns 0 on failure.
 *
 * A brand-new centre has no rows in half these tables, and one failing metric
 * should not take the whole dashboard down — the tile shows zero and the rest of
 * the page still renders.
 */
export async function safeCount(
  run: () => Promise<{ count: number }>,
): Promise<number> {
  try {
    return (await run()).count;
  } catch (error) {
    console.error("[dashboard] count failed:", error);
    return 0;
  }
}

/** Resolves a default relative to "now" that is safe to compare against. */
export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function endOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
}