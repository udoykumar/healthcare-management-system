import "server-only";

import { BloodGroup, Gender, RecordStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { RECORD_ACTIVE, scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";
import type { Prisma } from "@/generated/prisma/client";

import {
  asEnumValue,
  monthWindow,
  normalizeSearch,
  searchOr,
  startOfMonth,
  toMonthlySeries,
  type ListQuery,
  type Page,
} from "./_shared";

/**
 * Patient reads.
 *
 * Two access shapes, and the difference matters clinically:
 *
 *  - `listPatients` is centre-wide and requires PATIENT_READ. Admin and superadmin
 *    use it.
 *  - `getPatientForActor` resolves a single patient against the *caller*, and is
 *    the only function a detail page should use. A PATIENT role actor is pinned to
 *    their own `patientId`; a DOCTOR must have treated them (an appointment or a
 *    medical record exists), which is a narrower set than "every patient in my
 *    centre" — see §5/§58.
 */

const PATIENT_LIST_SELECT = {
  id: true,
  code: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  phone: true,
  email: true,
  city: true,
  status: true,
  registeredAt: true,
  insuranceProvider: true,
  insuranceNumber: true,
  profilePhotoUrl: true,
  user: { select: { status: true, isDeleted: true } },
} as const;

type PatientSelectRow = Prisma.PatientGetPayload<{
  select: typeof PATIENT_LIST_SELECT;
}>;

export type PatientListRow = {
  id: string;
  code: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  bloodGroup: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  registeredAt: Date;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  profilePhotoUrl: string | null;
  accountStatus: string | null;
};

export async function listPatients(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<PatientListRow>> {
  const statusFilter = asEnumValue(RecordStatus, query.filters.status);

  const where = {
    ...scopeToCenter(scope),
    ...RECORD_ACTIVE,
    /*
     * Spread conditionally rather than as `status: filter ?? undefined`. An
     * explicit `undefined` overrides the `RECORD_ACTIVE` default above it, so
     * "no filter" would quietly mean "include INACTIVE patients too".
     */
    ...(statusFilter ? { status: statusFilter } : {}),
    bloodGroup: asEnumValue(BloodGroup, query.filters.bloodGroup),
    gender: asEnumValue(Gender, query.filters.gender),
    ...(searchOr<"patient">(query.search, [
      "firstName",
      "lastName",
      "phone",
      "email",
      "code",
    ]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      select: PATIENT_LIST_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    items: rows.map(toPatientListRow),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

function toPatientListRow(row: PatientSelectRow): PatientListRow {
  return {
    id: row.id,
    code: row.code,
    firstName: row.firstName,
    lastName: row.lastName,
    name: `${row.firstName} ${row.lastName}`.trim(),
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    bloodGroup: row.bloodGroup,
    phone: row.phone,
    email: row.email,
    city: row.city,
    status: row.status,
    registeredAt: row.registeredAt,
    insuranceProvider: row.insuranceProvider,
    insuranceNumber: row.insuranceNumber,
    profilePhotoUrl: row.profilePhotoUrl,
    accountStatus: row.user?.isDeleted ? "DELETED" : (row.user?.status ?? null),
  };
}

/** Counts used by the admin dashboard and the patient table header. */
export async function patientSummary(scope: TenantScope) {
  const base = { ...scopeToCenter(scope), ...RECORD_ACTIVE };

  const [total, active, newThisMonth] = await Promise.all([
    prisma.patient.count({ where: base }),
    prisma.patient.count({
      where: { ...base, status: RecordStatus.ACTIVE },
    }),
    prisma.patient.count({
      where: { ...base, registeredAt: { gte: startOfMonth() } },
    }),
  ]);

  return { total, active, newThisMonth };
}

/**
 * One patient, resolved against the caller.
 *
 * Throws `AppError.notFound` — not `forbidden` — when the row exists but the
 * caller may not see it. Distinguishing "no such patient" from "not yours" would
 * confirm the existence of a record the caller is not entitled to know about
 * (§59, minimum-necessary disclosure).
 */
export async function getPatientForActor(
  scope: TenantScope,
  patientId: string,
) {
  if (scope.role === "PATIENT" && scope.patientId !== patientId) {
    throw AppError.notFound("That patient record was not found.");
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      ...scopeToCenter(scope),
      ...RECORD_ACTIVE,
      ...(scope.role === "DOCTOR" ? { appointments: { some: { doctorId: scope.doctorId ?? "" } } } : {}),
    },
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
      email: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelationship: true,
      profilePhotoUrl: true,
      familyMedicalHistory: true,
      notes: true,
      insuranceProvider: true,
      insuranceNumber: true,
      insuranceGroup: true,
      insuranceValidUntil: true,
      registeredAt: true,
      status: true,
      allergies: {
        where: { isActive: true },
        select: {
          id: true,
          substance: true,
          category: true,
          reaction: true,
          severity: true,
          notes: true,
        },
        orderBy: { severity: "desc" },
      },
      conditions: {
        select: { id: true, name: true, icd10Code: true, status: true, diagnosedOn: true },
        orderBy: { diagnosedOn: "desc" },
      },
      surgeries: {
        select: { id: true, procedure: true, performedOn: true, hospital: true, surgeon: true },
        orderBy: { performedOn: "desc" },
      },
      user: { select: { status: true, emailVerified: true, lastLoginAt: true } },
    },
  });

  if (!patient) throw AppError.notFound("That patient record was not found.");

  return patient;
}

/**
 * Distinct patients a doctor has seen.
 *
 * Derived from appointments rather than from `patient:read`, which the doctor
 * role deliberately does not hold. A doctor sees the people they have actually
 * treated, not the centre's whole patient list.
 */
export async function listDoctorPatients(
  scope: TenantScope,
  query: ListQuery,
) {
  if (!scope.doctorId) {
    throw AppError.forbidden("Only a doctor account can view this list.", "ROLE_REQUIRED");
  }

  const doctorId = scope.doctorId;

  // Search and filter on Patient, but paginate on Appointment: joining and paging
  // a one-to-many would yield duplicate patient rows.
  const matched = await prisma.patient.findMany({
    where: {
      ...scopeToCenter(scope),
      ...RECORD_ACTIVE,
      appointments: { some: { doctorId } },
      ...(searchOr<"patient">(query.search, ["firstName", "lastName", "phone", "code"]) ?? {}),
    },
    select: {
      ...PATIENT_LIST_SELECT,
      _count: {
        select: {
          appointments: { where: { doctorId } },
          medicalRecords: { where: { doctorId } },
        },
      },
      appointments: {
        where: { doctorId },
        select: { startAt: true, status: true },
        orderBy: { startAt: "desc" },
        take: 1,
      },
    },
    skip: query.skip,
    take: query.take,
    orderBy: query.orderBy,
  });

  const total = await prisma.patient.count({
    where: {
      ...scopeToCenter(scope),
      ...RECORD_ACTIVE,
      appointments: { some: { doctorId } },
      ...(searchOr<"patient">(query.search, ["firstName", "lastName", "phone", "code"]) ?? {}),
    },
  });

  return {
    items: matched.map((row) => ({
      ...toPatientListRow(row),
      visitCount: row._count.appointments,
      recordCount: row._count.medicalRecords,
      lastVisitAt: row.appointments[0]?.startAt ?? null,
      lastVisitStatus: row.appointments[0]?.status ?? null,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  } satisfies Page<ReturnType<typeof toPatientListRow> & {
    visitCount: number;
    recordCount: number;
    lastVisitAt: Date | null;
    lastVisitStatus: string | null;
  }>;
}

/**
 * Monthly registration counts, for the "patient growth" chart.
 *
 * Returns one bucket per month with the count in it, including months with no
 * registrations — a gap in a growth chart is read as "we stopped measuring",
 * not as "nobody joined".
 */
export async function patientGrowthSeries(scope: TenantScope, months = 6) {
  const { start, end } = monthWindow(months);

  const rows = await prisma.patient.findMany({
    where: { ...scopeToCenter(scope), ...RECORD_ACTIVE, registeredAt: { gte: start, lte: end } },
    select: { registeredAt: true },
    take: 20_000,
  });

  return toMonthlySeries(
    rows,
    months,
    (row) => row.registeredAt,
    () => 1,
    "New patients",
  );
}

/**
 * Recently registered patients, for the dashboard feed.
 *
 * Kept separate from `listPatients` because this one is not paged or filtered —
 * it is a fixed-size "who joined lately" list, and running it through the list
 * machinery would mean pretending it has a page 7.
 */
export async function listRecentPatients(
  scope: TenantScope,
  take = 6,
): Promise<
  { id: string; code: string; firstName: string; lastName: string; phone: string | null; registeredAt: Date }[]
> {
  return prisma.patient.findMany({
    where: { ...scopeToCenter(scope), ...RECORD_ACTIVE },
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      phone: true,
      registeredAt: true,
    },
    orderBy: { registeredAt: "desc" },
    take,
  });
}

/** Simple lookup used to populate doctor/patient pickers. */
export async function listPatientOptions(
  scope: TenantScope,
  search?: string,
  take = 25,
) {
  const term = normalizeSearch(search);

  return prisma.patient.findMany({
    where: {
      ...scopeToCenter(scope),
      ...RECORD_ACTIVE,
      ...(term
        ? {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { code: { contains: term, mode: "insensitive" } },
              { phone: { contains: term } },
            ],
          }
        : {}),
    },
    select: { id: true, code: true, firstName: true, lastName: true, phone: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take,
  });
}