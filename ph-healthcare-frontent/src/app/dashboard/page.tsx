import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RoleKey } from "@/generated/prisma/enums";
import { loadAuthorizedUser } from "@/lib/authz/session";
import { ROLE_HOME } from "@/config/navigation";

/**
 * Role router.
 *
 * `/dashboard` has no UI of its own — it forwards each account to the dashboard
 * for its role. Reading the role from the database (not from the session token)
 * means a demoted user lands in the correct place immediately rather than after
 * their token expires.
 */
export default async function DashboardIndex() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = await loadAuthorizedUser(session.user.id);

  if (!user) {
    // Session references an account that no longer exists or has been removed.
    redirect("/login?reason=account_unavailable");
  }

  if (user.status !== "ACTIVE") {
    redirect("/login?reason=account_suspended");
  }

  redirect(ROLE_HOME[user.role as RoleKey]);
}
