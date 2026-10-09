import { PERMISSIONS } from "@/lib/authz/permissions";
import { requireScopedUser } from "@/lib/authz/api";
import { ok, withErrorHandling } from "@/lib/api/response";
import { validate } from "@/lib/api/validate";
import { idSchema } from "@/lib/api/validate";
import { deleteNotification } from "@/services/notification.service";

/**
 * `DELETE /api/notifications/:id`
 *
 * Removes one of the caller's own notifications. The delete is also scoped by
 * `userId`, so an id belonging to another account simply matches nothing.
 */
export const DELETE = withErrorHandling(
  async (_request: Request, context: RouteContext<"/api/notifications/[id]">) => {
    const { user } = await requireScopedUser(PERMISSIONS.NOTIFICATION_READ_OWN);

    const { id } = await context.params;
    const notificationId = await validate(idSchema, id);

    await deleteNotification(user.id, notificationId);

    return ok({ id: notificationId }, "Notification deleted");
  },
);