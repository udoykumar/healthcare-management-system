import type { Metadata } from "next";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { NotificationsPage } from "@/components/dashboard/notifications-page";

/**
 * {role} notifications.
 *
 * The role guard lives here rather than in the shared component: the component is
 * rendered by four routes, and putting the check inside it would mean every route
 * could pass any role list. Guarding at the route is what makes the URL
 * meaningful.
 */

export const metadata: Metadata = { title: "Notifications" };

export default async function PatientNotificationsRoute({
  searchParams,
}: PageProps<"/dashboard/patient/notifications">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);

  return (
    <NotificationsPage
      user={user}
      searchParams={await searchParams}
      backHref="/dashboard/patient"
    />
  );
}
