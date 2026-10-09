import { PERMISSIONS } from "@/lib/authz/permissions";
import { requireScopedUser } from "@/lib/authz/api";
import { buildMeta, ok, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { listNotifications } from "@/services/notification.service";

/**
 * `GET /api/notifications`
 *
 * The list behind the notification bell and the notifications page. Scoped to the
 * caller by `userId` inside the service — there is no way to ask for another
 * account's notifications, and no query parameter could widen it.
 *
 * Dates are serialised by `NextResponse.json` as ISO strings, which is the shape
 * `NotificationPreview` in `components/dashboard/notification-bell.tsx` expects.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const { user } = await requireScopedUser(PERMISSIONS.NOTIFICATION_READ_OWN);

  const url = new URL(request.url);
  const query = await parseListParams(
    Object.fromEntries(url.searchParams.entries()),
    {
      sortableColumns: ["createdAt", "type"],
      fallbackSort: "createdAt",
      filterKeys: ["type", "unread"],
    },
  );

  const page = await listNotifications(user.id, query);

  return ok(
    { items: page.items },
    "Notifications retrieved",
    { meta: buildMeta(page.page, page.pageSize, page.total) },
  );
});