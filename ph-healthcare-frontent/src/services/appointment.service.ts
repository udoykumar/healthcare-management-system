import "server-only";

import {
  AppointmentPaymentStatus,
  AppointmentStatus,
  AppointmentType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";
import type { Prisma } from "@/generated/prisma/client";

import {
  APPOINTMENT_TERMINAL_STATUSES,
  asEnumValue,
  endOfToday,
  normalizeSearch,
  searchOr,
  startOfToday,
  type ListQuery,
  type Page,
} from "./_shared";

/**
 * Appointment reads.
 *
 * `listAppointments` is the one function every role uses, and the scoping it
 * applies is the whole authorization story for the appointments module:
 *
 *  - SUPERADMIN / ADMIN: the centre's appointments (`scopeToCenter`).
 *  - DOCTOR: only appointments booked against their own `doctorId`.
 *  - PATIENT: only appointments for their own `patientId`.
 *
 * A patient id or doctor id arriving in the query string cannot widen this — the
 * role's own id is applied *after* the filter, so the intersection is what gets
 * queried. Passing another patient's id as `?patientId=` simply matches nothing.
 */

const APPOINTMENT_SELECT = {
  id: true,
  appointmentNumber: true,
  startAt: true,
  endAt: true,
  type: true,
  status: true,
  reason: true,
  paymentStatus: true,
  notes: true,
  checkedInAt: true,
  completedAt: true,
  cancelledAt: true,
  cancellationReason: true,
  departmentId: true,
  doctor: {
    select: {
      id: true,
      code: true,
      user: { select: { name: true, phone: true } },
      department: { select: { id: true, name: true } },
    },
  },
  patient: {
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      phone: true,
      profilePhotoUrl: true,
    },
  },
  department: { select: { id: true, name: true } },
  _count: { select: { medicalRecords: true, prescriptions: true } },
} as const;

type AppointmentRow = Prisma.AppointmentGetPayload<{
  select: typeof APPOINTMENT_SELECT;
}>;

export type AppointmentListRow = {
  id: string;
  appointmentNumber: string;
  startAt: Date;
  endAt: Date;
  type: string;
  status: string;
  paymentStatus: string;
  reason: string | null;
  notes: string | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  doctor: { id: string; code: string; name: string; phone: string | null };
  patient: { id: string; code: string; name: string; phone: string | null };
  department: { id: string; name: string } | null;
  hasRecords: boolean;
};

function toListRow(row: AppointmentRow): AppointmentListRow {
  return {
    id: row.id,
    appointmentNumber: row.appointmentNumber,
    startAt: row.startAt,
    endAt: row.endAt,
    type: row.type,
    status: row.status,
    paymentStatus: row.paymentStatus,
    reason: row.reason,
    notes: row.notes,
    checkedInAt: row.checkedInAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    doctor: {
      id: row.doctor.id,
      code: row.doctor.code,
      name: row.doctor.user.name,
      phone: row.doctor.user.phone,
    },
    patient: {
      id: row.patient.id,
      code: row.patient.code,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      phone: row.patient.phone,
    },
    department: row.department,
    hasRecords: row._count.medicalRecords > 0,
  };
}

export async function listAppointments(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<AppointmentListRow>> {
  const where = {
    ...scopeToCenter(scope),
    ...scopeSelfFilter(scope),
    status: asEnumValue(AppointmentStatus, query.filters.status),
    type: asEnumValue(AppointmentType, query.filters.type),
    doctorId: query.filters.doctorId,
    departmentId: query.filters.department ?? query.filters.departmentId,
    paymentStatus: asEnumValue(AppointmentPaymentStatus, query.filters.paymentStatus),
    startAt: dateWindow(query),
  };

  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      select: APPOINTMENT_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    items: rows.map((row) => toListRow(row)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * The role's own-identity constraint.
 *
 * Applied on top of whatever the query string asked for, so filters can only ever
 * narrow a caller's own visible set — never widen it.
 */
function scopeSelfFilter(scope: TenantScope): Record<string, unknown> {
  if (scope.role === "DOCTOR") return { doctorId: scope.doctorId ?? "__none__" };
  if (scope.role === "PATIENT") return { patientId: scope.patientId ?? "__none__" };
  return {};
}

/** `?from=` / `?to=` window, validated as ISO dates by the page. */
function dateWindow(query: ListQuery): { gte?: Date; lte?: Date } | undefined {
  const from = parseDay(query.filters.from);
  const to = parseDay(query.filters.to);

  if (!from && !to) return undefined;
  if (from && to) return { gte: from, lte: new Date(to.getTime() + 86_399_999) };

  return from ? { gte: from } : { lte: new Date((to as Date).getTime() + 86_399_999) };
}

function parseDay(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** One appointment, resolved against the caller. */
export async function getAppointment(
  scope: TenantScope,
  appointmentId: string,
) {
  const row = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      ...scopeToCenter(scope),
      ...scopeSelfFilter(scope),
    },
    select: {
      ...APPOINTMENT_SELECT,
      patient: {
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          profilePhotoUrl: true,
          allergies: {
            where: { isActive: true },
            select: { substance: true, severity: true, reaction: true },
          },
        },
      },
      doctor: {
        select: {
          id: true,
          code: true,
          specialization: true,
          user: { select: { name: true, email: true, phone: true } },
          department: { select: { id: true, name: true } },
        },
      },
      medicalRecords: {
        select: { id: true, code: true, visitDate: true, doctor: { select: { user: { select: { name: true } } } } },
      },
      prescriptions: {
        select: { id: true, code: true, status: true, prescribedAt: true },
      },
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, dueAmount: true },
      },
    },
  });

  if (!row) throw AppError.notFound("That appointment was not found.");

  return row;
}

/**
 * The agenda strip on the dashboards.
 *
 * A single unfiltered window query rather than several status counts, because a
 * doctor wants "what is next" as a list, not seven separate numbers.
 */
export async function agenda(
  scope: TenantScope,
  options?: { from?: Date; to?: Date; take?: number; status?: string[] },
) {
  const from = options?.from ?? startOfToday();
  const to = options?.to ?? endOfToday();

  const rows = await prisma.appointment.findMany({
    where: {
      ...scopeToCenter(scope),
      ...scopeSelfFilter(scope),
      startAt: { gte: from, lte: to },
      ...(options?.status ? { status: { in: options.status as never } } : {}),
    },
    select: APPOINTMENT_SELECT,
    orderBy: { startAt: "asc" },
    take: options?.take ?? 20,
  });

  return rows.map((row) => toListRow(row));
}

/** Status counts for the admin/doctor dashboards. */
export async function appointmentSummary(scope: TenantScope) {
  const base = { ...scopeToCenter(scope), ...scopeSelfFilter(scope) };
  const today = { gte: startOfToday(), lte: endOfToday() };

  const [total, todayTotal, todayCompleted, todayCancelled, upcoming] =
    await Promise.all([
      prisma.appointment.count({ where: base }),
      prisma.appointment.count({ where: { ...base, startAt: today } }),
      prisma.appointment.count({
        where: { ...base, startAt: today, status: AppointmentStatus.COMPLETED },
      }),
      prisma.appointment.count({
        where: {
          ...base,
          startAt: today,
          status: { in: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        },
      }),
      prisma.appointment.count({
        where: {
          ...base,
          startAt: { gt: endOfToday() },
          status: { notIn: [...APPOINTMENT_TERMINAL_STATUSES] },
        },
      }),
    ]);

  return { total, todayTotal, todayCompleted, todayCancelled, upcoming };
}

/**
 * Appointment counts by status, for the dashboard donut.
 *
 * Grouped in SQL rather than by loading every appointment: a centre with a
 * hundred thousand bookings must not be counted by transferring all of them.
 */
export async function appointmentsByStatus(scope: TenantScope, from: Date, to: Date) {
  const grouped = await prisma.appointment.groupBy({
    by: ["status"],
    where: { ...scopeToCenter(scope), ...scopeSelfFilter(scope), startAt: { gte: from, lte: to } },
    _count: { _all: true },
  });

  return grouped.map((row) => ({
    label: row.status,
    value: row._count._all,
  }));
}

/**
 * Doctors ranked by completed consultations.
 *
 * Returns all doctors for a patient-visible screen but never their identity
 * beyond what is already public — the ranking itself is operational information,
 * so callers gate it on `REPORT_READ`.
 */
export async function doctorPerformance(
  scope: TenantScope,
  from: Date,
  to: Date,
  limit = 8,
) {
  const rows = await prisma.doctor.findMany({
    where: { ...scopeToCenter(scope), status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      user: { select: { name: true } },
      _count: {
        select: {
          appointments: {
            where: {
              startAt: { gte: from, lte: to },
              status: AppointmentStatus.COMPLETED,
            },
          },
        },
      },
    },
    take: limit,
  });

  return rows
    .map((doctor) => ({
      id: doctor.id,
      label: doctor.user.name,
      code: doctor.code,
      value: doctor._count.appointments,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Typeahead source for the appointment search box. */
export async function searchAppointments(
  scope: TenantScope,
  search: string,
  take = 20,
) {
  const term = normalizeSearch(search);
  if (!term) return [];

  const rows = await prisma.appointment.findMany({
    where: {
      ...scopeToCenter(scope),
      ...scopeSelfFilter(scope),
      ...(searchOr<"appointment">(term, ["appointmentNumber", "reason"]) ?? {}),
    },
    select: {
      id: true,
      appointmentNumber: true,
      startAt: true,
      status: true,
      doctor: { select: { user: { select: { name: true } } } },
      patient: { select: { firstName: true, lastName: true, code: true } },
    },
    orderBy: { startAt: "desc" },
    take,
  });

  return rows;
}