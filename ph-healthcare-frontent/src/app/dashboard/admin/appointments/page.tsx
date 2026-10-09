import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import {
  AppointmentStatus,
  AppointmentType,
  RoleKey,
} from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { parseListParams } from "@/lib/api/list-params";
import { listAppointments } from "@/services/appointment.service";
import { listDepartmentOptions } from "@/services/department.service";
import { listDoctorOptions } from "@/services/doctor.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatDateTime, formatTime, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Appointments" };

/**
 * Centre-wide appointment book.
 *
 * Filter dropdowns are populated from the database rather than from a constant:
 * the doctor and department lists are centre data, and a centre that has retired a
 * doctor should not have them offered in a filter forever (§12).
 */
export default async function AdminAppointmentsPage({
  searchParams,
}: PageProps<"/dashboard/admin/appointments">) {
  const { user } = await requireDashboardContext([RoleKey.ADMIN]);
  requirePermission(user, PERMISSIONS.APPOINTMENT_READ);

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["startAt", "status", "type", "createdAt"],
    fallbackSort: "startAt",
    defaultOrder: "desc",
    filterKeys: ["status", "type", "doctorId", "department", "from", "to"],
  });

  const [page, doctors, departments] = await Promise.all([
    listAppointments(user.tenant, query),
    listDoctorOptions(user.tenant),
    listDepartmentOptions(user.tenant),
  ]);

  const filters: TableFilterConfig[] = [
    {
      key: "status",
      label: "Appointment status",
      options: Object.values(AppointmentStatus).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "type",
      label: "Appointment type",
      options: Object.values(AppointmentType).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "doctorId",
      label: "Doctor",
      options: doctors.map((doctor) => ({
        value: doctor.id,
        label: doctor.name,
      })),
    },
    {
      key: "department",
      label: "Department",
      options: departments.map((department) => ({
        value: department.id,
        label: department.name,
      })),
    },
  ];

  type Row = (typeof page.items)[number];

  const columns: DataTableColumn<Row>[] = [
    {
      id: "number",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.appointmentNumber}
        </span>
      ),
      meta: { nowrap: true },
      toggleable: false,
    },
    {
      id: "when",
      header: "When",
      sortKey: "startAt",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {formatDateTime(row.original.startAt)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatTime(row.original.startAt)}–{formatTime(row.original.endAt)} ·{" "}
            {humanize(row.original.type)}
          </p>
        </div>
      ),
      toggleable: false,
    },
    {
      id: "patient",
      header: "Patient",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.patient.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.patient.code}
          </p>
        </div>
      ),
      toggleable: false,
    },
    {
      id: "doctor",
      header: "Doctor",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate">{row.original.doctor.name}</p>
          {row.original.department ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.original.department.name}
            </p>
          ) : null}
        </div>
      ),
      toggleable: false,
    },
    {
      id: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {row.original.reason ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortKey: "status",
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      meta: { nowrap: true },
    },
    {
      id: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Appointments"
          description="Every booking across the center, from request to completion."
          icon={CalendarDays}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Appointments, newest first"
          searchPlaceholder="Search by reference or reason…"
          searchLabel="Search appointments"
          filters={filters}
          emptyTitle="No appointments match these filters"
          emptyDescription="Try widening the status filter or clearing the search."
        />
      </PageSection>
    </PageContainer>
  );
}