import "server-only";

import { LabRequestStatus, PrescriptionStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";

import { searchOr, startOfToday, type ListQuery, type Page } from "./_shared";

/**
 * Clinical record reads.
 *
 * Access (§15, §58):
 *
 *  - PATIENT may read their own records. Never write — a patient cannot alter a
 *    consultation, a diagnosis or a prescription.
 *  - DOCTOR may read the records of patients they have treated. Writing is
 *    refused for records another doctor wrote; see `assertRecordEditable`.
 *  - ADMIN/SUPERADMIN may read centre-wide for billing and audit purposes, which
 *    is what `patient:view-clinical` grants.
 */

export type MedicalTimelineEntry =
  | { kind: "appointment"; at: Date; data: Record<string, unknown> }
  | { kind: "record"; at: Date; data: Record<string, unknown> }
  | { kind: "prescription"; at: Date; data: Record<string, unknown> }
  | { kind: "lab-request"; at: Date; data: Record<string, unknown> }
  | { kind: "lab-result"; at: Date; data: Record<string, unknown> }
  | { kind: "invoice"; at: Date; data: Record<string, unknown> };

/**
 * A patient's history as one chronological list.
 *
 * Built from five parallel queries and merged in memory rather than as a database
 * union: each source has a different shape and a different amount of detail, and
 * a SQL `UNION ALL` across them would mean either a wide nullable row or five
 * casts. The cost is bounded by `take` on each query, so a patient with a decade
 * of history still returns a fixed number of rows.
 */
export async function patientTimeline(
  scope: TenantScope,
  patientId: string,
  options?: { limit?: number },
) {
  await assertPatientReadable(scope, patientId);

  const limit = options?.limit ?? 60;
  const center = scopeToCenter(scope);

  const [appointments, records, prescriptions, labRequests, labResults, invoices] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { patientId, ...center },
        select: {
          id: true,
          appointmentNumber: true,
          startAt: true,
          status: true,
          type: true,
          reason: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
        orderBy: { startAt: "desc" },
        take: limit,
      }),
      prisma.medicalRecord.findMany({
        where: { patientId, ...center, isVoided: false },
        select: {
          id: true,
          code: true,
          visitDate: true,
          chiefComplaint: true,
          followUpDate: true,
          doctor: { select: { user: { select: { name: true } } } },
          vitals: { select: { id: true, measuredAt: true, heartRate: true, temperature: true, bloodPressureSystolic: true, bloodPressureDiastolic: true, weight: true, isAbnormal: true }, take: 1 },
          diagnoses: {
            select: { id: true, description: true, icd10Code: true, type: true, diagnosedAt: true },
            orderBy: { diagnosedAt: "desc" },
          },
        },
        orderBy: { visitDate: "desc" },
        take: limit,
      }),
      prisma.prescription.findMany({
        where: { patientId, ...center },
        select: {
          id: true,
          code: true,
          status: true,
          prescribedAt: true,
          doctor: { select: { user: { select: { name: true } } } },
          items: {
            select: { id: true, medicineName: true, dosage: true, frequency: true, duration: true, route: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { prescribedAt: "desc" },
        take: limit,
      }),
      prisma.labRequest.findMany({
        where: { patientId, ...center },
        select: {
          id: true,
          code: true,
          status: true,
          priority: true,
          requestedAt: true,
          completedAt: true,
          items: { select: { test: { select: { name: true } } } },
        },
        orderBy: { requestedAt: "desc" },
        take: limit,
      }),
      prisma.labResult.findMany({
        where: { patientId, ...center, labRequest: { status: LabRequestStatus.COMPLETED } },
        select: {
          id: true,
          code: true,
          overallStatus: true,
          reportedAt: true,
          test: { select: { name: true } },
        },
        orderBy: { reportedAt: "desc" },
        take: limit,
      }),
      prisma.invoice.findMany({
        where: { patientId, ...center },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          dueAmount: true,
          issuedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

  const entries: MedicalTimelineEntry[] = [
    ...appointments.map((row) => ({
      kind: "appointment" as const,
      at: row.startAt,
      data: row as unknown as Record<string, unknown>,
    })),
    ...records.map((row) => ({
      kind: "record" as const,
      at: row.visitDate,
      data: row as unknown as Record<string, unknown>,
    })),
    ...prescriptions.map((row) => ({
      kind: "prescription" as const,
      at: row.prescribedAt,
      data: row as unknown as Record<string, unknown>,
    })),
    ...labRequests.map((row) => ({
      kind: "lab-request" as const,
      at: row.requestedAt,
      data: row as unknown as Record<string, unknown>,
    })),
    ...labResults.map((row) => ({
      kind: "lab-result" as const,
      at: row.reportedAt,
      data: row as unknown as Record<string, unknown>,
    })),
    ...invoices.map((row) => ({
      kind: "invoice" as const,
      at: row.issuedAt ?? row.createdAt,
      data: row as unknown as Record<string, unknown>,
    })),
  ];

  // Newest first: a timeline is read downwards, and the most recent event is
  // what a returning patient wants to see without scrolling.
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * A patient's current diagnoses, with superseded entries excluded.
 *
 * Superseded rows are kept in the database on purpose (§16) — a correction must
 * not erase the original — so the "current" list has to filter them explicitly.
 */
export async function currentDiagnoses(scope: TenantScope, patientId: string) {
  await assertPatientReadable(scope, patientId);

  return prisma.diagnosis.findMany({
    where: { patientId, ...scopeToCenter(scope), isSuperseded: false },
    select: {
      id: true,
      code: true,
      description: true,
      icd10Code: true,
      type: true,
      diagnosedAt: true,
      resolvedAt: true,
      notes: true,
      doctor: { select: { user: { select: { name: true } } } },
      medicalRecord: { select: { code: true, visitDate: true } },
    },
    orderBy: [{ type: "asc" }, { diagnosedAt: "desc" }],
  });
}

export async function listMedicalRecords(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<unknown>> {
  const doctorFilter =
    scope.role === "DOCTOR" ? { doctorId: scope.doctorId ?? "__none__" } : {};
  const patientFilter =
    scope.role === "PATIENT" ? { patientId: scope.patientId ?? "__none__" } : {};

  const where = {
    ...scopeToCenter(scope),
    ...doctorFilter,
    ...patientFilter,
    isVoided: false,
    ...(query.filters.patientId ? { patientId: query.filters.patientId } : {}),
    visitDate: dateFilter(query.filters.from, query.filters.to),
    ...(searchOr<"medicalRecord">(query.search, ["code", "chiefComplaint", "symptoms", "treatmentPlan"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where,
      select: {
        id: true,
        code: true,
        visitDate: true,
        chiefComplaint: true,
        symptoms: true,
        examination: true,
        treatmentPlan: true,
        clinicalNotes: true,
        adviceGiven: true,
        followUpDate: true,
        patient: { select: { id: true, code: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, code: true, user: { select: { name: true } } } },
        appointment: { select: { id: true, appointmentNumber: true } },
        diagnoses: { select: { id: true, description: true, type: true } },
        vitals: { select: { id: true, measuredAt: true, isAbnormal: true }, take: 1 },
        _count: { select: { prescriptions: true, labRequests: true } },
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.medicalRecord.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      patient: {
        ...row.patient,
        name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      },
      hasAbnormalVitals: row.vitals[0]?.isAbnormal ?? false,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getMedicalRecord(scope: TenantScope, recordId: string) {
  const row = await prisma.medicalRecord.findFirst({
    where: {
      id: recordId,
      ...scopeToCenter(scope),
      ...(scope.role === "DOCTOR" ? { doctorId: scope.doctorId ?? "__none__" } : {}),
      ...(scope.role === "PATIENT" ? { patientId: scope.patientId ?? "__none__" } : {}),
    },
    select: {
      id: true,
      code: true,
      visitDate: true,
      chiefComplaint: true,
      symptoms: true,
      examination: true,
      treatmentPlan: true,
      clinicalNotes: true,
      adviceGiven: true,
      followUpDate: true,
      isVoided: true,
      voidedReason: true,
      patient: {
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          allergies: { where: { isActive: true }, select: { substance: true, severity: true, reaction: true } },
        },
      },
      doctor: { select: { id: true, code: true, user: { select: { name: true } } } },
      appointment: { select: { id: true, appointmentNumber: true, startAt: true } },
      vitals: { orderBy: { measuredAt: "asc" } },
      diagnoses: {
        select: {
          id: true,
          code: true,
          description: true,
          icd10Code: true,
          type: true,
          notes: true,
          diagnosedAt: true,
          isSuperseded: true,
        },
        orderBy: { diagnosedAt: "asc" },
      },
      prescriptions: {
        select: {
          id: true,
          code: true,
          status: true,
          prescribedAt: true,
          items: {
            select: { id: true, medicineName: true, dosage: true, frequency: true, duration: true, route: true, instructions: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { prescribedAt: "asc" },
      },
      labRequests: {
        select: {
          id: true,
          code: true,
          status: true,
          priority: true,
          requestedAt: true,
          items: { select: { test: { select: { name: true } } } },
        },
      },
    },
  });

  if (!row) throw AppError.notFound("That medical record was not found.");

  return row;
}

/**
 * A doctor's own workload counters.
 *
 * `pending` is deliberately "consultation not yet completed" rather than a status
 * count: a checked-in patient waiting to be seen and a confirmed appointment both
 * need attention, and neither is COMPLETED.
 */
export async function doctorRecordSummary(scope: TenantScope, doctorId: string) {
  const center = scopeToCenter(scope);
  const today = { gte: startOfToday(), lte: new Date(Date.now() + 12 * 60 * 60 * 1000) };

  const [records, todayRecords, patients, pendingPrescriptions] = await Promise.all([
    prisma.medicalRecord.count({
      where: { doctorId, ...center, isVoided: false },
    }),
    prisma.medicalRecord.count({
      where: { doctorId, ...center, isVoided: false, visitDate: today },
    }),
    prisma.patient.count({
      where: { ...center, appointments: { some: { doctorId } } },
    }),
    prisma.prescription.count({
      where: { doctorId, ...center, status: PrescriptionStatus.DRAFT },
    }),
  ]);

  return { records, todayRecords, patients, pendingPrescriptions };
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

/**
 * Confirms the caller may read this patient's clinical data.
 *
 * A doctor must have an appointment with or a record for the patient. That is a
 * narrower set than "patient of my centre", which is the point of §5: a doctor's
 * patient list is derived from their own caseload.
 */
export async function assertPatientReadable(
  scope: TenantScope,
  patientId: string,
): Promise<void> {
  if (scope.role === "PATIENT") {
    if (scope.patientId !== patientId) {
      throw AppError.notFound("That patient record was not found.");
    }
    return;
  }

  if (scope.role === "DOCTOR") {
    const doctorId = scope.doctorId;
    if (!doctorId) throw AppError.forbidden("This account has no doctor profile.", "NO_DOCTOR_PROFILE");

    const treated = await prisma.appointment.findFirst({
      where: { patientId, doctorId, ...scopeToCenter(scope) },
      select: { id: true },
    });

    if (!treated) {
      throw AppError.forbidden(
        "You can only access records for patients you have treated.",
        "NOT_YOUR_PATIENT",
      );
    }
  }
}