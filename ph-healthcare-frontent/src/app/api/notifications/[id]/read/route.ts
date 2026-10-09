import { PERMISSIONS } from "@/lib/authz/permissions";
import { requireScopedUser } from "@/lib/authz/api";
import { ok, withErrorHandling } from "@/lib/api/response";
import { idSchema } from "@/lib/api/validate";
import { validate } from "@/lib/api/validate";
import { markNotificationRead } from "@/services/notification.service";

/**
 * `PATCH /api/notifications/:id/read`
 *
 * Marks one notification read. The `userId` guard lives in the service's
 * `updateMany`, so a caller who guesses another account's notification id gets a
 * 404 rather than being able to touch it.
 */
export const PATCH = withErrorHandling(
  async (_request: Request, context: RouteContext<"/api/notifications/[id]/read">) => {
    const { user } = await requireScopedUser(PERMISSIONS.NOTIFICATION_READ_OWN);

    const { id } = await context.params;
    const notificationId = await validate(idSchema, id);

    await markNotificationRead(user.id, notificationId);

    return ok({ id: notificationId }, "Notification marked as read");
  },
);