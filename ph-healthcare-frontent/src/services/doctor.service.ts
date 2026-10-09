import "server-only";

import { RecordStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { RECORD_ACTIVE, scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";
import type { Prisma } from "@/generated/prisma/client";

import {
  asEnumValue,
  normalizeSearch,
  searchOr,
  type ListQuery,
  type Page,
} from "./_shared";

/**
 * Doctor reads.
 *
 * `listDoctors` is deliberately available to PATIENT too: choosing a doctor to
 * book with is not privileged information. What a patient must not get is the
 * doctor's patients, their schedules in detail, or their revenue — those are
 * separate functions and separate permissions.
 */

const DOCTOR_LIST_SELECT = {
  id: true,
  code: true,
  specialization: true,
  qualification: true,
  licenseNumber: true,
  experienceYears: true,
  consultationFee: true,
  status: true,
  ratingAverage: true,
  ratingCount: true,
  bio: true,
  city: true,
  profilePhotoUrl: true,
  dateOfBirth: true,
  gender: true,
  defaultSlotDurationMinutes: true,
  bookingWindowDays: true,
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      status: true,
      isDeleted: true,
      lastLoginAt: true,
    },
  },
  department: { select: { id: true, name: true, code: true } },
} as const;

type DoctorRow = Prisma.DoctorGetPayload<{ select: typeof DOCTOR_LIST_SELECT }>;

export type DoctorListRow = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  specialization: string | null;
  qualification: string | null;
  licenseNumber: string;
  experienceYears: number;
  consultationFee: number;
  status: string;
  accountStatus: string | null;
  ratingAverage: number;
  ratingCount: number;
  bio: string | null;
  city: string | null;
  profilePhotoUrl: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  slotDurationMinutes: number;
  bookingWindowDays: number;
  department: { id: string; name: string; code: string } | null;
};

function toDoctorListRow(row: DoctorRow): DoctorListRow {
  return {
    id: row.id,
    code: row.code,
    name: row.user.name,
    email: row.user.email,
    phone: row.user.phone,
    image: row.user.image ?? row.profilePhotoUrl,
    specialization: row.specialization,
    qualification: row.qualification,
    licenseNumber: row.licenseNumber,
    experienceYears: row.experienceYears,
    consultationFee: Number(row.consultationFee.toString()),
    status: row.status,
    accountStatus: row.user.isDeleted ? "DELETED" : row.user.status,
    ratingAverage: Number(row.ratingAverage.toString()),
    ratingCount: row.ratingCount,
    bio: row.bio,
    city: row.city,
    profilePhotoUrl: row.profilePhotoUrl,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    slotDurationMinutes: row.defaultSlotDurationMinutes,
    bookingWindowDays: row.bookingWindowDays,
    department: row.department,
  };
}

/**
 * Translates a sort key into a Prisma `orderBy`.
 *
 * The doctor table shows the clinician's *name*, which lives on the related `User`
 * row, not on `Doctor`. Prisma 7 rejects an unknown `orderBy` key at runtime, so
 * the screen's public sort key ("name") cannot be passed straight through — it has
 * to become `{ user: { name: order } }` here.
 *
 * Every sortable key is listed explicitly. An unrecognised key falls back to
 * `code`, which is unique and therefore a stable order.
 */
export const DOCTOR_SORTABLE_COLUMNS = [
  "name",
  "experienceYears",
  "ratingAverage",
  "consultationFee",
  "code",
] as const;

function doctorOrderBy(
  sort: string,
  order: "asc" | "desc",
): Record<string, unknown> {
  switch (sort) {
    case "name":
      return { user: { name: order } };
    case "experienceYears":
    case "ratingAverage":
    case "consultationFee":
    case "code":
      return { [sort]: order };
    default:
      return { code: order };
  }
}

export async function listDoctors(
  scope: TenantScope,
  query: ListQuery,
  options?: { onlyActive?: boolean; departmentId?: string },
): Promise<Page<DoctorListRow>> {
  const statusFilter = asEnumValue(RecordStatus, query.filters.status);

  const where = {
    ...scopeToCenter(scope),
    ...RECORD_ACTIVE,
    // Conditional spreads, not `status: filter ?? undefined` — see the note in
    // patient.service.ts about an explicit undefined clobbering the default.
    ...(options?.onlyActive || !statusFilter
      ? {}
      : { status: statusFilter }),
    departmentId: options?.departmentId ?? query.filters.departmentId,
    // "user.*" fields are dot-qualified; `searchOr` nests them into a relation
    // filter, which is the only shape Prisma accepts.
    ...(searchOr<"doctor">(query.search, [
      "licenseNumber",
      "specialization",
      "code",
      "user.name",
      "user.email",
    ]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      select: DOCTOR_LIST_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: doctorOrderBy(query.sort, query.order),
    }),
    prisma.doctor.count({ where }),
  ]);

  return {
    items: rows.map(toDoctorListRow),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * One doctor.
 *
 * A patient may look up any active doctor; a doctor may only look themselves up
 * without `doctor:read`. The distinction is enforced by the caller's permission
 * check on the page, and `getDoctorProfile` returns only public profile fields —
 * no schedule, no patients, no revenue.
 */
export async function getDoctorProfile(
  scope: TenantScope,
  doctorId: string,
): Promise<DoctorListRow> {
  if (scope.role === "DOCTOR" && scope.doctorId !== doctorId) {
    throw AppError.notFound("That doctor was not found.");
  }

  const row = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      ...scopeToCenter(scope),
      ...RECORD_ACTIVE,
    },
    select: DOCTOR_LIST_SELECT,
  });

  if (!row) throw AppError.notFound("That doctor was not found.");

  return toDoctorListRow(row);
}

/** Headline counts for the admin dashboard. */
export async function doctorSummary(scope: TenantScope) {
  const base = { ...scopeToCenter(scope), ...RECORD_ACTIVE };

  const [total, active] = await Promise.all([
    prisma.doctor.count({ where: base }),
    prisma.doctor.count({ where: { ...base, status: RecordStatus.ACTIVE } }),
  ]);

  return { total, active };
}

/** Picker source for appointment forms and filters. */
export async function listDoctorOptions(
  scope: TenantScope,
  options?: { departmentId?: string; search?: string },
) {
  const term = normalizeSearch(options?.search);

  const rows = await prisma.doctor.findMany({
    where: {
      ...scopeToCenter(scope),
      status: RecordStatus.ACTIVE,
      departmentId: options?.departmentId,
      ...(term
        ? {
            OR: [
              { user: { name: { contains: term, mode: "insensitive" } } },
              { specialization: { contains: term, mode: "insensitive" } },
              { licenseNumber: { contains: term } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      code: true,
      user: { select: { name: true } },
      specialization: true,
      department: { select: { name: true } },
      consultationFee: true,
    },
    orderBy: { user: { name: "asc" } },
    take: 50,
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.user.name,
    specialization: row.specialization,
    department: row.department?.name ?? null,
    consultationFee: Number(row.consultationFee.toString()),
  }));
}

/**
 * Published review summary for a doctor.
 *
 * Only `PUBLISHED` rows are counted and only their rating is returned — the
 * moderation state of a review is admin information, not something a patient
 * browsing doctors should be able to infer.
 */
export async function listDoctorReviews(
  scope: TenantScope,
  doctorId: string,
  take = 20,
) {
  return prisma.review.findMany({
    where: {
      doctorId,
      status: "PUBLISHED",
      ...scopeToCenter(scope),
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      patient: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}