import "server-only";

import { RecordStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";

import { asEnumValue, type ListQuery } from "./_shared";

/**
 * Department reads.
 *
 * Departments are per-tenant data and never hardcoded (§12): the catalogue is
 * seeded, then edited by an admin, and the UI reads whatever is in the table.
 * Counts come back with each row so the list screen does not need a second query
 * per department.
 */

export type DepartmentRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
  phone: string | null;
  email: string | null;
  location: string | null;
  defaultConsultationFee: number | null;
  headDoctor: { id: string; name: string } | null;
  doctorCount: number;
  appointmentCount: number;
};

export async function listDepartments(
  scope: TenantScope,
  query?: ListQuery,
  options?: { onlyActive?: boolean },
): Promise<DepartmentRow[]> {
  const where = {
    ...scopeToCenter(scope),
    ...(options?.onlyActive ? { status: RecordStatus.ACTIVE } : {}),
    ...(query?.filters.status
      ? { status: asEnumValue(RecordStatus, query.filters.status) }
      : {}),
  };

  const rows = await prisma.department.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      status: true,
      sortOrder: true,
      phone: true,
      email: true,
      location: true,
      defaultConsultationFee: true,
      headDoctor: { select: { id: true, user: { select: { name: true } } } },
      _count: { select: { doctors: true, appointments: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    phone: row.phone,
    email: row.email,
    location: row.location,
    defaultConsultationFee:
      row.defaultConsultationFee === null
        ? null
        : Number(row.defaultConsultationFee.toString()),
    headDoctor: row.headDoctor
      ? { id: row.headDoctor.id, name: row.headDoctor.user.name }
      : null,
    doctorCount: row._count.doctors,
    appointmentCount: row._count.appointments,
  }));
}

/** Picker source for appointment and doctor forms. */
export async function listDepartmentOptions(scope: TenantScope) {
  return prisma.department.findMany({
    where: { ...scopeToCenter(scope), status: RecordStatus.ACTIVE },
    select: { id: true, name: true, code: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/**
 * Doctors in a department, with their workload.
 *
 * Powers both the admin department screen and the doctor dashboard's department
 * ranking.
 */
export async function departmentPerformance(scope: TenantScope, limit = 10) {
  const departments = await prisma.department.findMany({
    where: { ...scopeToCenter(scope), status: RecordStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      _count: { select: { doctors: true, appointments: true } },
    },
    orderBy: { appointments: { _count: "desc" } },
    take: limit,
  });

  return departments.map((department) => ({
    id: department.id,
    label: department.name,
    doctors: department._count.doctors,
    appointments: department._count.appointments,
  }));
}

export async function getDepartment(
  scope: TenantScope,
  departmentId: string,
): Promise<DepartmentRow & { doctors: unknown[] }> {
  const row = await prisma.department.findFirst({
    where: { id: departmentId, ...scopeToCenter(scope) },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      status: true,
      sortOrder: true,
      phone: true,
      email: true,
      location: true,
      defaultConsultationFee: true,
      headDoctor: { select: { id: true, user: { select: { name: true } } } },
      _count: { select: { doctors: true, appointments: true } },
      doctors: {
        where: { status: RecordStatus.ACTIVE },
        select: {
          id: true,
          code: true,
          specialization: true,
          user: { select: { name: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  // An out-of-tenant id is reported as "not found" rather than "forbidden", so
  // the response does not confirm the existence of another tenant's rows.
  if (!row) throw AppError.notFound("That department was not found.");

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    phone: row.phone,
    email: row.email,
    location: row.location,
    defaultConsultationFee:
      row.defaultConsultationFee === null
        ? null
        : Number(row.defaultConsultationFee.toString()),
    headDoctor: row.headDoctor
      ? { id: row.headDoctor.id, name: row.headDoctor.user.name }
      : null,
    doctorCount: row._count.doctors,
    appointmentCount: row._count.appointments,
    doctors: row.doctors.map((doctor) => ({
      id: doctor.id,
      code: doctor.code,
      name: doctor.user.name,
      specialization: doctor.specialization,
    })),
  };
}
