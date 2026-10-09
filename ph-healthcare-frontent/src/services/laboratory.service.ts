import "server-only";

import { LabRequestStatus, LabPriority, RecordStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
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
 * Laboratory reads.
 *
 * The access split mirrors the clinical rule in the schema comment: a doctor
 * reads the requests and results they ordered, a patient reads only their own
 * published results, and centre staff see the whole queue so the lab can work.
 *
 * Nothing here interprets a value. Flagging abnormal results is the
 * pathologist's job — see §69: this system records and reports, it does not
 * diagnose.
 */

const REQUEST_SELECT = {
  id: true,
  code: true,
  status: true,
  priority: true,
  clinicalNotes: true,
  provisionalDiagnosis: true,
  requestedAt: true,
  sampleCollectedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelledReason: true,
  patient: { select: { id: true, code: true, firstName: true, lastName: true, phone: true } },
  doctor: { select: { id: true, code: true, user: { select: { name: true } } } },
  items: {
    select: {
      id: true,
      status: true,
      price: true,
      isBilled: true,
      test: { select: { id: true, code: true, name: true, shortName: true, sampleType: true } },
    },
    orderBy: { sortOrder: "asc" },
  },
  results: {
    select: {
      id: true,
      code: true,
      overallStatus: true,
      reportedAt: true,
      verifiedAt: true,
      test: { select: { name: true } },
      _count: { select: { values: true } },
    },
  },
} as const;

type RequestRow = Prisma.LabRequestGetPayload<{ select: typeof REQUEST_SELECT }>;

export type LabRequestRowShape = {
  id: string;
  code: string;
  status: string;
  priority: string;
  clinicalNotes: string | null;
  provisionalDiagnosis: string | null;
  requestedAt: Date;
  sampleCollectedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  patient: { id: string; code: string; name: string; phone: string | null };
  doctor: { id: string; code: string; name: string };
  tests: {
    id: string;
    name: string;
    shortName: string | null;
    sampleType: string | null;
    status: string;
    price: number;
    isBilled: boolean;
  }[];
  results: {
    id: string;
    code: string;
    testName: string;
    overallStatus: string;
    reportedAt: Date;
    verifiedAt: Date | null;
    valueCount: number;
  }[];
};

function toRequest(row: RequestRow): LabRequestRowShape {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    priority: row.priority,
    clinicalNotes: row.clinicalNotes,
    provisionalDiagnosis: row.provisionalDiagnosis,
    requestedAt: row.requestedAt,
    sampleCollectedAt: row.sampleCollectedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    cancelledReason: row.cancelledReason,
    patient: {
      id: row.patient.id,
      code: row.patient.code,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      phone: row.patient.phone,
    },
    doctor: { id: row.doctor.id, code: row.doctor.code, name: row.doctor.user.name },
    tests: row.items.map((item) => ({
      id: item.test.id,
      name: item.test.name,
      shortName: item.test.shortName,
      sampleType: item.test.sampleType,
      status: item.status,
      price: Number(item.price.toString()),
      isBilled: item.isBilled,
    })),
    results: row.results.map((result) => ({
      id: result.id,
      code: result.code,
      testName: result.test.name,
      overallStatus: result.overallStatus,
      reportedAt: result.reportedAt,
      verifiedAt: result.verifiedAt,
      valueCount: result._count.values,
    })),
  };
}

/** Doctor sees what they ordered; patient sees their own; staff see the queue. */
function scopeRequestFilter(scope: TenantScope): Record<string, unknown> {
  if (scope.role === "DOCTOR") return { doctorId: scope.doctorId ?? "__none__" };
  if (scope.role === "PATIENT") return { patientId: scope.patientId ?? "__none__" };
  return {};
}

export async function listLabRequests(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<LabRequestRowShape>> {
  const where = {
    ...scopeToCenter(scope),
    ...scopeRequestFilter(scope),
    status: asEnumValue(LabRequestStatus, query.filters.status),
    priority: asEnumValue(LabPriority, query.filters.priority),
    doctorId: query.filters.doctorId,
    requestedAt: rangeFilter(query.filters.from, query.filters.to),
    ...(searchOr<"labRequest">(query.search, ["code", "provisionalDiagnosis", "clinicalNotes"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.labRequest.findMany({
      where,
      select: REQUEST_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.labRequest.count({ where }),
  ]);

  return {
    items: rows.map((row) => toRequest(row)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getLabRequest(scope: TenantScope, requestId: string) {
  const row = await prisma.labRequest.findFirst({
    where: { id: requestId, ...scopeToCenter(scope), ...scopeRequestFilter(scope) },
    select: {
      ...REQUEST_SELECT,
      medicalRecord: { select: { id: true, code: true, visitDate: true } },
      appointment: { select: { id: true, appointmentNumber: true, startAt: true } },
      results: {
        select: {
          id: true,
          code: true,
          overallStatus: true,
          notes: true,
          summary: true,
          reportedAt: true,
          verifiedAt: true,
          performedByName: true,
          verifiedByName: true,
          test: {
            select: {
              id: true,
              name: true,
              method: true,
              parameters: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  referenceRangeText: true,
                  referenceRangeLow: true,
                  referenceRangeHigh: true,
                  sortOrder: true,
                },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          values: {
            select: {
              id: true,
              parameterId: true,
              parameterName: true,
              resultValue: true,
              resultText: true,
              unit: true,
              referenceRangeText: true,
              abnormalFlag: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!row) throw AppError.notFound("That laboratory request was not found.");

  return row;
}

export type LabResultRowShape = {
  id: string;
  code: string;
  overallStatus: string;
  summary: string | null;
  notes: string | null;
  reportedAt: Date;
  verifiedAt: Date | null;
  performedByName: string | null;
  verifiedByName: string | null;
  test: { id: string; name: string; method: string | null };
  patient: {
    id: string;
    code: string;
    name: string;
    dateOfBirth: Date;
    gender: string;
  };
  doctor: { id: string; code: string; name: string };
  valueCount: number;
};

/**
 * Published results.
 *
 * Only results whose parent request is COMPLETED are returned, so a patient
 * cannot see a half-entered report while the lab is still working on it.
 *
 * The ordering clinician is read through `labRequest` — `LabResult` has no direct
 * relation to `Doctor`, because a result belongs to the *request*, not to a
 * clinician.
 */
export async function listLabResults(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<LabResultRowShape>> {
  if (scope.role === "PATIENT" && !scope.patientId) {
    throw AppError.forbidden("No patient record is linked to this account.", "NO_PATIENT_PROFILE");
  }

  const where = {
    ...scopeToCenter(scope),
    labRequest: {
      status: LabRequestStatus.COMPLETED,
      ...(scope.role === "PATIENT"
        ? { patientId: scope.patientId ?? "__none__" }
        : scope.role === "DOCTOR"
          ? { doctorId: scope.doctorId ?? "__none__" }
          : {}),
    },
    reportedAt: rangeFilter(query.filters.from, query.filters.to),
    ...(searchOr<"labResult">(query.search, ["code", "test.name"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.labResult.findMany({
      where,
      select: {
        id: true,
        code: true,
        overallStatus: true,
        summary: true,
        notes: true,
        reportedAt: true,
        verifiedAt: true,
        performedByName: true,
        verifiedByName: true,
        test: { select: { id: true, name: true, method: true } },
        patient: { select: { id: true, code: true, firstName: true, lastName: true, dateOfBirth: true, gender: true } },
        labRequest: {
          select: {
            doctor: { select: { id: true, code: true, user: { select: { name: true } } } },
          },
        },
        _count: { select: { values: true } },
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.labResult.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.code,
      overallStatus: row.overallStatus,
      summary: row.summary,
      notes: row.notes,
      reportedAt: row.reportedAt,
      verifiedAt: row.verifiedAt,
      performedByName: row.performedByName,
      verifiedByName: row.verifiedByName,
      test: row.test,
      patient: {
        ...row.patient,
        name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      },
      doctor: {
        id: row.labRequest.doctor.id,
        code: row.labRequest.doctor.code,
        name: row.labRequest.doctor.user.name,
      },
      valueCount: row._count.values,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export type LabTestRowShape = {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  description: string | null;
  price: number;
  turnaroundHours: number;
  sampleType: string | null;
  sampleContainer: string | null;
  preparationInstructions: string | null;
  requiresFasting: boolean;
  method: string | null;
  status: string;
  category: { id: string; name: string } | null;
  parameterCount: number;
};

/** The test catalogue. Visible within a centre: patients may see what a test is. */
export async function listLabTests(
  scope: TenantScope,
  query?: ListQuery,
  options?: { onlyActive?: boolean },
): Promise<Page<LabTestRowShape>> {
  const where = {
    ...scopeToCenter(scope),
    ...(options?.onlyActive !== false ? { status: RecordStatus.ACTIVE } : {}),
    categoryId: query?.filters.categoryId,
    ...(searchOr<"laboratoryTest">(query?.search, ["name", "shortName", "code", "method"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.laboratoryTest.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        description: true,
        price: true,
        turnaroundHours: true,
        sampleType: true,
        sampleContainer: true,
        preparationInstructions: true,
        requiresFasting: true,
        method: true,
        status: true,
        category: { select: { id: true, name: true } },
        _count: { select: { parameters: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      skip: query?.skip ?? 0,
      take: query?.take ?? 50,
    }),
    prisma.laboratoryTest.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      price: Number(row.price.toString()),
      parameterCount: row._count.parameters,
      _count: undefined,
    })),
    total,
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 50,
  } as Page<LabTestRowShape>;
}

/** Queue counts for the lab dashboard. */
export async function labSummary(scope: TenantScope) {
  const base = { ...scopeToCenter(scope), ...scopeRequestFilter(scope) };

  const [total, pending, inProgress, completed] = await Promise.all([
    prisma.labRequest.count({ where: base }),
    prisma.labRequest.count({
      where: { ...base, status: LabRequestStatus.REQUESTED },
    }),
    prisma.labRequest.count({
      where: {
        ...base,
        status: { in: [LabRequestStatus.SAMPLE_COLLECTED, LabRequestStatus.PROCESSING] },
      },
    }),
    prisma.labRequest.count({
      where: { ...base, status: LabRequestStatus.COMPLETED },
    }),
  ]);

  return { total, pending, inProgress, completed };
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

/** Test picker for the "request a test" form. */
export async function listLabTestOptions(scope: TenantScope, search?: string, take = 30) {
  const term = normalizeSearch(search);

  return prisma.laboratoryTest.findMany({
    where: {
      ...scopeToCenter(scope),
      status: RecordStatus.ACTIVE,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { shortName: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, code: true, name: true, shortName: true, price: true, sampleType: true },
    orderBy: { name: "asc" },
    take,
  });
}