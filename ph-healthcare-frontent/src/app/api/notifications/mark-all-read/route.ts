import { PERMISSIONS } from "@/lib/authz/permissions";
import { requireScopedUser } from "@/lib/authz/api";
import { ok, withErrorHandling } from "@/lib/api/response";
import { markAllNotificationsRead } from "@/services/notification.service";

/**
 * `POST /api/notifications/mark-all-read`
 *
 * Backs the "Mark all read" button in the bell. Scoped to the caller inside the
 * service, so this can only ever clear the caller's own unread notifications.
 *
 * A POST rather than a PATCH on a collection: it is a state change that is not
 * idempotent in the "already read" sense — a second call correctly reports zero
 * updated.
 */
export const POST = withErrorHandling(async () => {
  const { user } = await requireScopedUser(PERMISSIONS.NOTIFICATION_READ_OWN);

  const updated = await markAllNotificationsRead(user.id);

  return ok({ updated }, "Notifications marked as read");
});