import type { Metadata } from "next";
import Link from "next/link";
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
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatDateTime, formatTime, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My appointments" };

/**
 * A patient's own appointments.
 *
 * No doctor filter and no patient filter: the service pins the query to the
 * caller's own `patientId`, so the list cannot be widened by editing the URL. The
 * controls that remain are the ones a patient would actually use.
 */
export default async function PatientAppointmentsPage({
  searchParams,
}: PageProps<"/dashboard/patient/appointments">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.APPOINTMENT_READ_OWN);

  if (!user.patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["startAt", "status", "type"],
    fallbackSort: "startAt",
    defaultOrder: "desc",
    filterKeys: ["status", "type"],
  });

  const page = await listAppointments(user.tenant, query);

  const filters: TableFilterConfig[] = [
    {
      key: "status",
      label: "Appointment status",
      options: [
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ].map((value) => ({ value, label: humanize(value) })),
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
      id: "reference",
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
      id: "doctor",
      header: "Doctor",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.doctor.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.department?.name ?? row.original.doctor.code}
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
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="My appointments"
          description="Everything booked in your name, past and upcoming."
          icon={CalendarDays}
          actions={
            <Button size="sm" render={<Link href="/dashboard/patient/doctors" />}>
              Book an appointment
            </Button>
          }
        />

        {page.total === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="You have no appointments"
            description="Book with a doctor and the appointment will appear here."
            action={
              <Button size="sm" render={<Link href="/dashboard/patient/doctors" />}>
                Find a doctor
              </Button>
            }
          />
        ) : (
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
        )}
      </PageSection>
    </PageContainer>
  );
}