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
import { AppError } from "@/lib/api/errors";
import { parseListParams } from "@/lib/api/list-params";
import { listAppointments } from "@/services/appointment.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatDateTime, formatTime, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My appointments" };

/**
 * A doctor's own appointment book.
 *
 * There is deliberately no doctor filter here. The service pins the query to
 * `scope.doctorId`, so a doctor cannot reach another clinician's book by editing
 * the URL — the filter is not rendered because it would be a lie, not because it
 * would be hidden.
 */
export default async function DoctorAppointmentsPage({
  searchParams,
}: PageProps<"/dashboard/doctor/appointments">) {
  const { user } = await requireDashboardContext([RoleKey.DOCTOR]);
  requirePermission(user, PERMISSIONS.APPOINTMENT_READ);

  if (!user.doctorId) {
    throw AppError.forbidden(
      "This account is not linked to a doctor profile. Contact your administrator.",
      "NO_DOCTOR_PROFILE",
    );
  }

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["startAt", "status", "type"],
    fallbackSort: "startAt",
    defaultOrder: "desc",
    filterKeys: ["status", "type", "from", "to"],
  });

  const page = await listAppointments(user.tenant, query);

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
            {row.original.patient.phone ? ` · ${row.original.patient.phone}` : ""}
          </p>
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
          title="My appointments"
          description="Bookings against your own list, across past and future."
          icon={CalendarDays}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Your appointments, newest first"
          searchPlaceholder="Search by reference or reason…"
          searchLabel="Search my appointments"
          filters={filters}
          emptyTitle="No appointments match these filters"
          emptyDescription="Try a different status or clear the search."
        />
      </PageSection>
    </PageContainer>
  );
}