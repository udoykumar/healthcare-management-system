import "server-only";

import { PrescriptionStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";

import { asEnumValue, normalizeSearch, searchOr, type ListQuery, type Page } from "./_shared";

/**
 * Prescription reads.
 *
 * Patients may read their own prescriptions and doctors may read the ones they
 * wrote; neither role holds a centre-wide `prescription:read` over other
 * prescribers' work, so the self-filter is applied here rather than trusted from
 * the caller.
 */

const PRESCRIPTION_SELECT = {
  id: true,
  code: true,
  status: true,
  diagnosisSummary: true,
  instructions: true,
  generalAdvice: true,
  followUpDate: true,
  prescribedAt: true,
  issuedAt: true,
  patient: {
    select: { id: true, code: true, firstName: true, lastName: true, dateOfBirth: true },
  },
  doctor: {
    select: { id: true, code: true, user: { select: { name: true } } },
  },
  medicalRecord: { select: { id: true, code: true, visitDate: true } },
  items: {
    select: {
      id: true,
      medicineId: true,
      medicineName: true,
      dosage: true,
      frequency: true,
      frequencyText: true,
      duration: true,
      route: true,
      instructions: true,
      quantity: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  },
  appointment: { select: { id: true, appointmentNumber: true, startAt: true } },
} as const;

type PrescriptionRow = {
  id: string;
  code: string;
  status: string;
  diagnosisSummary: string | null;
  instructions: string | null;
  generalAdvice: string | null;
  followUpDate: Date | null;
  prescribedAt: Date;
  issuedAt: Date | null;
  patient: { id: string; code: string; firstName: string; lastName: string; dateOfBirth: Date };
  doctor: { id: string; code: string; user: { name: string } };
  medicalRecord: { id: string; code: string; visitDate: Date } | null;
  appointment: { id: string; appointmentNumber: string; startAt: Date } | null;
  items: {
    id: string;
    medicineId: string | null;
    medicineName: string;
    dosage: string;
    frequency: string;
    frequencyText: string | null;
    duration: string;
    route: string;
    instructions: string | null;
    quantity: number | null;
  }[];
};

export type PrescriptionRowShape = {
  id: string;
  code: string;
  status: string;
  diagnosisSummary: string | null;
  instructions: string | null;
  generalAdvice: string | null;
  followUpDate: Date | null;
  prescribedAt: Date;
  issuedAt: Date | null;
  patient: { id: string; code: string; name: string; dateOfBirth: Date };
  doctor: { id: string; code: string; name: string };
  visitDate: Date | null;
  appointment: { id: string; appointmentNumber: string; startAt: Date } | null;
  items: PrescriptionRow["items"];
};

function toPrescription(row: PrescriptionRow): PrescriptionRowShape {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    diagnosisSummary: row.diagnosisSummary,
    instructions: row.instructions,
    generalAdvice: row.generalAdvice,
    followUpDate: row.followUpDate,
    prescribedAt: row.prescribedAt,
    issuedAt: row.issuedAt,
    patient: {
      id: row.patient.id,
      code: row.patient.code,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      dateOfBirth: row.patient.dateOfBirth,
    },
    doctor: { id: row.doctor.id, code: row.doctor.code, name: row.doctor.user.name },
    visitDate: row.medicalRecord?.visitDate ?? null,
    appointment: row.appointment,
    items: row.items,
  };
}

/**
 * Who a caller may read prescriptions for.
 *
 * DOCTOR → only what they prescribed. PATIENT → only their own. Admin and
 * superadmin see the centre's prescriptions, which is what billing and pharmacy
 * need.
 */
function scopePrescriptionFilter(scope: TenantScope): Record<string, unknown> {
  if (scope.role === "DOCTOR") return { doctorId: scope.doctorId ?? "__none__" };
  if (scope.role === "PATIENT") return { patientId: scope.patientId ?? "__none__" };
  return {};
}

export async function listPrescriptions(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<PrescriptionRowShape>> {
  const where = {
    ...scopeToCenter(scope),
    ...scopePrescriptionFilter(scope),
    status: asEnumValue(PrescriptionStatus, query.filters.status),
    doctorId: query.filters.doctorId,
    patientId: query.filters.patientId,
    prescribedAt: rangeFilter(query.filters.from, query.filters.to),
    ...(searchOr<"prescription">(query.search, ["code", "diagnosisSummary"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      select: PRESCRIPTION_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.prescription.count({ where }),
  ]);

  return {
    items: rows.map((row) => toPrescription(row as PrescriptionRow)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/** One prescription, with the same authorization as the list. */
export async function getPrescription(scope: TenantScope, prescriptionId: string) {
  const row = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      ...scopeToCenter(scope),
      ...scopePrescriptionFilter(scope),
    },
    select: PRESCRIPTION_SELECT,
  });

  if (!row) throw AppError.notFound("That prescription was not found.");

  return toPrescription(row as PrescriptionRow);
}

/**
 * Medicines a patient is currently taking.
 *
 * Derived from issued prescription items rather than a `Patient.currentMeds`
 * column, because the schema deliberately keeps a single source of truth: what was
 * actually prescribed. Only items on prescriptions that are past their follow-up
 * window or still current are considered, which is why this takes a horizon
 * argument rather than returning everything ever prescribed.
 */
export async function activeMedications(scope: TenantScope, patientId: string) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const rows = await prisma.prescriptionItem.findMany({
    where: {
      prescription: {
        patientId,
        ...scopeToCenter(scope),
        status: PrescriptionStatus.ISSUED,
        prescribedAt: { gte: since },
      },
    },
    select: {
      id: true,
      medicineName: true,
      dosage: true,
      frequency: true,
      frequencyText: true,
      duration: true,
      route: true,
      instructions: true,
      prescription: {
        select: {
          id: true,
          code: true,
          prescribedAt: true,
          followUpDate: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { prescription: { prescribedAt: "desc" } },
    take: 40,
  });

  return rows;
}

/** Short counts for the doctor and patient dashboards. */
export async function prescriptionSummary(scope: TenantScope) {
  const base = {
    ...scopeToCenter(scope),
    ...scopePrescriptionFilter(scope),
  };

  const [total, drafts] = await Promise.all([
    prisma.prescription.count({ where: base }),
    prisma.prescription.count({
      where: { ...base, status: PrescriptionStatus.DRAFT },
    }),
  ]);

  return { total, drafts };
}

function rangeFilter(
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

/** Picker source for a new prescription line. */
export async function searchMedicines(
  scope: TenantScope,
  search: string | undefined,
  take = 20,
) {
  const term = normalizeSearch(search);

  return prisma.medicine.findMany({
    where: {
      ...scopeToCenter(scope),
      status: "ACTIVE",
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { genericName: { contains: term, mode: "insensitive" } },
              { brandName: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      genericName: true,
      strength: true,
      dosageForm: true,
      unitPrice: true,
      isPrescribable: true,
    },
    orderBy: { name: "asc" },
    take,
  });
}