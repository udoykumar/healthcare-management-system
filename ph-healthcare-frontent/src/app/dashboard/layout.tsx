import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { RoleKey } from "@/generated/prisma/enums";
import { loadAuthorizedUser, requireUser } from "@/lib/authz/session";
import { prisma } from "@/lib/db/prisma";
import { ROLE_HOME } from "@/config/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopBar } from "@/components/dashboard/dashboard-topbar";

/**
 * The shared shell for every authenticated area.
 *
 * This layout is the outer gate. It resolves the session from the database, checks
 * the account is usable, and decides which sidebar to show. It does *not* decide
 * what a given page may show — each page enforces its own permissions, so the
 * authorization story does not depend on this layout being present.
 */

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s · Dashboard",
  },
  // Belt and braces with the root metadata: authenticated pages are never indexed.
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = requireUser(await loadAuthorizedUser(session.user.id));

  /*
   * Unread notification count for the bell and the sidebar badge.
   *
   * Counted per user and scoped by `readAt`. A doctor with no notification
   * permission still gets zero rather than an error, which keeps this layout from
   * becoming the thing that breaks for a role that has not been configured yet.
   */
  const unreadNotifications = await prisma.notification
    .count({
      where: { userId: user.id, readAt: null },
    })
    .catch(() => 0);

  const sidebarUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    healthcareCenterName: user.healthcareCenterName,
  };

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={sidebarUser}
        permissions={user.permissions}
        isSuperuser={user.isSuperuser}
        unreadNotifications={unreadNotifications}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar
          user={sidebarUser}
          unreadNotifications={unreadNotifications}
          notificationsHref={`${ROLE_HOME[user.role as RoleKey]}/notifications`}
        />

        {/* The skip link in the root layout targets this id. */}
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}