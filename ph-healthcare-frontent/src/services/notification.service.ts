import "server-only";

import { AuditAction, NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/api/errors";
import { nextCode, CODE_PREFIX } from "@/lib/db/code-counter";
import { audit } from "@/lib/audit/log";

import type { Prisma } from "@/generated/prisma/client";
import type { TenantScope } from "@/lib/db/tenant";
import { asEnumValue, searchOr, type ListQuery, type Page } from "./_shared";

/**
 * Notifications.
 *
 * Notifications are addressed to a *login account* (`User`), not to a Patient or
 * Doctor row, because the bell in the top bar is the reader and the bell belongs
 * to whichever login a person holds.
 *
 * Reads are therefore always `{ userId: <caller> }` — there is deliberately no
 * centre-wide notification listing for ordinary roles. A superadmin reading
 * another tenant's notification bodies would be a privacy hole, and nothing in
 * the product needs it: the audit log covers "who did what".
 */

export type NotificationRow = {
  id: string;
  code: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function listNotifications(
  userId: string,
  query: ListQuery,
): Promise<Page<NotificationRow>> {
  const where = {
    userId,
    type: asEnumValue(NotificationType, query.filters.type),
    ...(query.filters.unread === "true" ? { readAt: null } : {}),
    ...(searchOr<"notification">(query.search, ["title", "body"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        code: true,
        type: true,
        title: true,
        body: true,
        actionUrl: true,
        readAt: true,
        createdAt: true,
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.notification.count({ where }),
  ]);

  return { items: rows, total, page: query.page, pageSize: query.pageSize };
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/**
 * Marks one notification read.
 *
 * The `userId` inside the `where` clause *is* the authorization: a caller cannot
 * mark somebody else's notification read by guessing an id. That is why this is
 * `updateMany` and not `update` — `update` would take the id alone and trust it.
 */
export async function markNotificationRead(userId: string, notificationId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });

  if (result.count === 0) {
    throw AppError.notFound("That notification was not found.");
  }
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return result.count;
}

export async function deleteNotification(userId: string, notificationId: string) {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });

  if (result.count === 0) {
    throw AppError.notFound("That notification was not found.");
  }
}

/**
 * Records an in-app notification.
 *
 * `dedupeKey` makes this idempotent per user, which is what lets the reminder job
 * run repeatedly without recording the same 24-hour reminder twice. The unique
 * index on `(userId, dedupeKey)` is the real enforcement.
 *
 * The index covers a *nullable* column, so Prisma does not generate a compound
 * `upsert` where-clause for it and the write is a create guarded by catching the
 * unique-violation code. A duplicate is not an error here — it means the job has
 * already done its job — so the existing row is returned instead.
 */
export async function notify(params: {
  userId: string;
  healthcareCenterId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const data = {
    code: await nextCode(prisma, CODE_PREFIX.NOTIFICATION),
    userId: params.userId,
    healthcareCenterId: params.healthcareCenterId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    actionUrl: params.actionUrl ?? null,
    dedupeKey: params.dedupeKey ?? null,
    metadata: params.metadata ?? undefined,
  };

  try {
    return await prisma.notification.create({ data });
  } catch (error) {
    if (!params.dedupeKey || !isUniqueViolation(error)) throw error;

    const existing = await prisma.notification.findFirst({
      where: { userId: params.userId, dedupeKey: params.dedupeKey },
    });

    if (!existing) throw error;
    return existing;
  }
}

/** Postgres unique-violation, surfaced by Prisma as code P2002. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Sends an ad-hoc notification from centre staff, with an audit row.
 *
 * Recorded as `SETTINGS_UPDATED` because that is the closest existing audit action
 * for "staff initiated a change that other people will see". When a dedicated
 * `NOTIFICATION_SENT` action is added to the enum it should replace this.
 */
export async function sendNotificationAs(
  scope: TenantScope,
  actorId: string,
  params: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    actionUrl?: string | null;
  },
) {
  if (!scope.healthcareCenterId) {
    throw AppError.forbidden(
      "Notifications can only be sent from within a healthcare center.",
      "ROLE_REQUIRED",
    );
  }

  const created = await notify({
    ...params,
    healthcareCenterId: scope.healthcareCenterId,
  });

  await audit({
    action: AuditAction.SETTINGS_UPDATED,
    userId: actorId,
    healthcareCenterId: scope.healthcareCenterId,
    entity: "Notification",
    entityId: created.id,
    // Identifiers and the type only — a notification body can contain clinical
    // text, and the audit log is readable by centre admins.
    metadata: { type: params.type, recipientUserId: params.userId },
  });

  return created;
}