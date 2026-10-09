import "server-only";

import { AuditAction, RoleKey, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { USER_NOT_DELETED, scopeToCenter, type TenantScope } from "@/lib/db/tenant";

import { asEnumValue, searchOr, type ListQuery, type Page } from "./_shared";

/**
 * Users, audit log and centres — the superadmin-facing reads.
 *
 * Superadmin is the one role whose `healthcareCenterId` is null, which
 * `scopeToCenter` treats as "no tenant restriction". Every other role is pinned to
 * one centre. That is the entire multi-tenancy model: there is no per-query
 * special case, just the meaning of a null scope.
 */

export type UserRow = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  role: string;
  healthcareCenterId: string | null;
  healthcareCenterName: string | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export async function listUsers(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<UserRow>> {
  const role = asEnumValue(RoleKey, query.filters.role);
  const status = asEnumValue(UserStatus, query.filters.status);

  const where = {
    // Superadmin sees the platform; everyone else sees only their own centre.
    ...(scope.role === RoleKey.SUPERADMIN ? {} : { healthcareCenterId: scope.healthcareCenterId }),
    ...USER_NOT_DELETED,
    role: role ? { key: role } : undefined,
    status,
    ...(searchOr<"user">(query.search, ["name", "email", "code", "phone"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        healthcareCenterId: true,
        healthcareCenter: { select: { name: true } },
        role: { select: { key: true } },
        patient: { select: { code: true } },
        doctor: { select: { code: true } },
        staff: { select: { code: true, designation: true } },
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      role: row.role?.key ?? "PATIENT",
      healthcareCenterId: row.healthcareCenterId,
      healthcareCenterName: row.healthcareCenter?.name ?? null,
      emailVerified: row.emailVerified !== null,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export type CenterRow = {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  timezone: string;
  currency: string;
  subscriptionPlan: string | null;
  subscriptionEndsAt: Date | null;
  createdAt: Date;
  counts: { users: number; doctors: number; patients: number; appointments: number };
};

export async function listCenters(query: ListQuery): Promise<Page<CenterRow>> {
  const status = asEnumValue(UserStatus, query.filters.status);

  const where = {
    status,
    ...(searchOr<"healthcareCenter">(query.search, ["name", "code", "city", "email"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.healthcareCenter.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        status: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        timezone: true,
        currency: true,
        subscriptionPlan: true,
        subscriptionEndsAt: true,
        createdAt: true,
        _count: { select: { users: true, doctors: true, patients: true, appointments: true } },
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.healthcareCenter.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      slug: row.slug,
      status: row.status,
      email: row.email,
      phone: row.phone,
      city: row.city,
      country: row.country,
      timezone: row.timezone,
      currency: row.currency,
      subscriptionPlan: row.subscriptionPlan,
      subscriptionEndsAt: row.subscriptionEndsAt,
      createdAt: row.createdAt,
      counts: {
        users: row._count.users,
        doctors: row._count.doctors,
        patients: row._count.patients,
        appointments: row._count.appointments,
      },
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Audit log.
 *
 * Superadmin sees the whole platform; an admin sees only their own centre's rows.
 * Both go through `scopeToCenter`, so there is no separate "admin audit" query to
 * keep in sync.
 *
 * `metadata` is deliberately not selected for display on the list screen beyond a
 * truncated summary: audit metadata holds identifiers, not clinical content, and a
 * 100-row page of raw JSON is unreadable anyway.
 */
export async function listAuditLogs(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<unknown>> {
  const action = asEnumValue(AuditAction, query.filters.action);

  const where = {
    ...scopeToCenter(scope),
    action,
    userId: query.filters.userId,
    entity: query.filters.entity,
    succeeded: query.filters.succeeded
      ? query.filters.succeeded === "true"
      : undefined,
    createdAt: dateFilter(query.filters.from, query.filters.to),
    ...(searchOr<"auditLog">(query.search, ["action", "entity", "entityId", "reason"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        ipAddress: true,
        succeeded: true,
        reason: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        healthcareCenter: { select: { name: true } },
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      ipAddress: row.ipAddress,
      succeeded: row.succeeded,
      reason: row.reason,
      createdAt: row.createdAt,
      actor: row.user
        ? { id: row.user.id, name: row.user.name, email: row.user.email }
        : null,
      centerName: row.healthcareCenter?.name ?? null,
      // Only the keys, never the values: a metadata blob can contain identifiers
      // that are not meant to be on screen in a shared list.
      metadataKeys:
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? Object.keys(row.metadata as Record<string, unknown>)
          : [],
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/** Platform-level counters for the superadmin dashboard. */
export async function platformSummary() {
  const [centers, activeCenters, admins, doctors, patients, appointments, newUsers] =
    await Promise.all([
      prisma.healthcareCenter.count(),
      prisma.healthcareCenter.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({
        where: { ...USER_NOT_DELETED, role: { key: RoleKey.ADMIN }, healthcareCenterId: { not: null } },
      }),
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.user.count({
        where: {
          ...USER_NOT_DELETED,
          createdAt: {
            gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
          },
        },
      }),
    ]);

  return {
    centers,
    activeCenters,
    admins,
    doctors,
    patients,
    appointments,
    newUsers,
  };
}

/** Ten most recently created accounts, for the superadmin dashboard. */
export async function recentUsers(limit = 8) {
  return prisma.user.findMany({
    where: USER_NOT_DELETED,
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      role: { select: { key: true } },
      healthcareCenter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Ten most recent audit rows, for the superadmin dashboard. */
export async function recentAuditLogs(limit = 8) {
  return prisma.auditLog.findMany({
    select: {
      id: true,
      action: true,
      entity: true,
      succeeded: true,
      createdAt: true,
      user: { select: { name: true } },
      healthcareCenter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function dateFilter(
  from: string | undefined,
  to: string | undefined,
): { gte?: Date; lte?: Date } | undefined {
  const gte = parseDay(from);
  const lte = parseDay(to);
  if (!gte && !lte) return undefined;
  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte: new Date(lte.getTime() + 86_399_999) } : {}),
  };
}

function parseDay(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}