import type { Metadata } from "next";
import { Users } from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { AppError } from "@/lib/api/errors";
import { parseListParams } from "@/lib/api/list-params";
import { listDoctorPatients } from "@/services/patient.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ServerDataTable } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import {
  calculateAge,
  formatDate,
  formatRelative,
  humanize,
} from "@/lib/utils/format";

export const metadata: Metadata = { title: "My patients" };

/**
 * A doctor's caseload.
 *
 * Derived from appointments and records rather than from the centre's patient
 * register — the doctor role deliberately does *not* hold `patient:read`, only
 * `patient:read-own`, so there is no centre-wide list to accidentally expose.
 * "Own" means "people you have an appointment with" (§5).
 */
export default async function DoctorPatientsPage({
  searchParams,
}: PageProps<"/dashboard/doctor/patients">) {
  const { user } = await requireDashboardContext([RoleKey.DOCTOR]);
  requirePermission(user, PERMISSIONS.PATIENT_READ_OWN);

  if (!user.doctorId) {
    throw AppError.forbidden(
      "This account is not linked to a doctor profile. Contact your administrator.",
      "NO_DOCTOR_PROFILE",
    );
  }

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["lastName", "firstName", "code", "registeredAt"],
    fallbackSort: "registeredAt",
    filterKeys: [],
  });

  const page = await listDoctorPatients(user.tenant, query);

  type Row = (typeof page.items)[number];

  const columns: DataTableColumn<Row>[] = [
    {
      id: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
      meta: { nowrap: true },
      toggleable: false,
    },
    {
      id: "name",
      header: "Patient",
      sortKey: "lastName",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.email ?? "No email on file"}
          </p>
        </div>
      ),
      toggleable: false,
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.phone ?? "—"}</span>
      ),
      meta: { nowrap: true },
    },
    {
      id: "age",
      header: "Age",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {calculateAge(row.original.dateOfBirth)}
        </span>
      ),
      meta: { nowrap: true },
    },
    {
      id: "bloodGroup",
      header: "Blood group",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.bloodGroup === "UNKNOWN"
            ? "—"
            : humanize(row.original.bloodGroup)}
        </span>
      ),
      meta: { nowrap: true },
    },
    {
      id: "visits",
      header: "My visits",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.visitCount}</span>
      ),
      meta: { align: "right", nowrap: true },
    },
    {
      id: "records",
      header: "Records",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.recordCount}</span>
      ),
      meta: { align: "right", nowrap: true },
    },
    {
      id: "lastVisit",
      header: "Last seen",
      cell: ({ row }) =>
        row.original.lastVisitAt ? (
          <div className="min-w-0">
            <p className="truncate text-sm">
              {formatDate(row.original.lastVisitAt)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatRelative(row.original.lastVisitAt)}
              {row.original.lastVisitStatus
                ? ` · ${humanize(row.original.lastVisitStatus)}`
                : ""}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      meta: { nowrap: true },
    },
    {
      id: "status",
      header: "Record",
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="My patients"
          description="People you have an appointment or a consultation record with."
          icon={Users}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Patients in your care"
          searchPlaceholder="Search by name, code or phone…"
          searchLabel="Search my patients"
          emptyTitle="No patients yet"
          emptyDescription="Patients appear here once you have an appointment with them."
        />
      </PageSection>
    </PageContainer>
  );
}