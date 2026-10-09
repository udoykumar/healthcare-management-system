import type { Metadata } from "next";
import { Users } from "lucide-react";

import { BloodGroup, Gender, RecordStatus } from "@/generated/prisma/enums";
import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { parseListParams } from "@/lib/api/list-params";
import { listPatients } from "@/services/patient.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { calculateAge, formatDate, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Patients" };

/**
 * Centre-wide patient register.
 *
 * Two guards, and the order matters: the layout-level `requireDashboardContext`
 * keeps other roles out of the URL, and `requirePermission` enforces the actual
 * permission. A centre may grant its admin `patient:read` but not `patient:read`,
 * and hiding the nav item is not what stops the request.
 */
export default async function AdminPatientsPage({
  searchParams,
}: PageProps<"/dashboard/admin/patients">) {
  const { user } = await requireDashboardContext([RoleKey.ADMIN]);
  requirePermission(user, PERMISSIONS.PATIENT_READ);

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["lastName", "firstName", "code", "registeredAt"],
    fallbackSort: "registeredAt",
    filterKeys: ["status", "gender", "bloodGroup"],
  });

  const page = await listPatients(user.tenant, query);

  const filters: TableFilterConfig[] = [
    {
      key: "status",
      label: "Record status",
      options: Object.values(RecordStatus).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "gender",
      label: "Gender",
      options: Object.values(Gender).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "bloodGroup",
      label: "Blood group",
      options: Object.values(BloodGroup)
        .filter((value) => value !== "UNKNOWN")
        .map((value) => ({ value, label: humanize(value) })),
    },
  ];

  type Row = (typeof page.items)[number];

  const columns: DataTableColumn<Row>[] = [
    {
      id: "code",
      header: "Code",
      sortKey: "code",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
      meta: { nowrap: true },
      toggleable: false,
    },
    {
      id: "name",
      header: "Name",
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
        <div className="min-w-0">
          <p className="truncate text-sm">{row.original.phone ?? "—"}</p>
          {row.original.city ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.original.city}
            </p>
          ) : null}
        </div>
      ),
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
      id: "gender",
      header: "Gender",
      cell: ({ row }) => humanize(row.original.gender),
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
      id: "insurance",
      header: "Insurance",
      cell: ({ row }) =>
        row.original.insuranceProvider ? (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.original.insuranceProvider}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.insuranceNumber}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          dot
          label={
            row.original.accountStatus && row.original.accountStatus !== "ACTIVE"
              ? `Account ${humanize(row.original.accountStatus)}`
              : undefined
          }
        />
      ),
      meta: { nowrap: true },
    },
    {
      id: "registeredAt",
      header: "Registered",
      sortKey: "registeredAt",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.registeredAt)}
        </span>
      ),
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Patients"
          description="Everyone registered with this healthcare center."
          icon={Users}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Patients, most recently registered first"
          searchPlaceholder="Search by name, code, phone or email…"
          searchLabel="Search patients"
          filters={filters}
          emptyTitle="No patients found"
          emptyDescription="Try a different search term or clear the filters."
        />
      </PageSection>
    </PageContainer>
  );
}