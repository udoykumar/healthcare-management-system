import type { Metadata } from "next";
import { Star, Stethoscope } from "lucide-react";

import { RecordStatus, RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { parseListParams } from "@/lib/api/list-params";
import { listDoctors } from "@/services/doctor.service";
import { listDepartmentOptions } from "@/services/department.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatCurrency, humanize, initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Doctors" };

/** The centre's doctor roster, with department and fee. */
export default async function AdminDoctorsPage({
  searchParams,
}: PageProps<"/dashboard/admin/doctors">) {
  const { user } = await requireDashboardContext([RoleKey.ADMIN]);
  requirePermission(user, PERMISSIONS.DOCTOR_READ);

  const currency = user.healthcareCenterCurrency ?? "USD";

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["name", "experienceYears", "ratingAverage", "consultationFee"],
    fallbackSort: "name",
    defaultOrder: "asc",
    filterKeys: ["status", "departmentId"],
  });

  const [page, departments] = await Promise.all([
    listDoctors(user.tenant, query),
    listDepartmentOptions(user.tenant),
  ]);

  const filters: TableFilterConfig[] = [
    {
      key: "status",
      label: "Doctor status",
      options: Object.values(RecordStatus).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "departmentId",
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
      id: "name",
      header: "Doctor",
      sortKey: "name",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8 shrink-0">
            {row.original.image ? (
              <AvatarImage src={row.original.image} alt="" />
            ) : null}
            <AvatarFallback className="text-xs">
              {initials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.code}
              {row.original.email ? ` · ${row.original.email}` : ""}
            </p>
          </div>
        </div>
      ),
      toggleable: false,
    },
    {
      id: "department",
      header: "Department",
      cell: ({ row }) =>
        row.original.department ? (
          <Badge variant="secondary">{row.original.department.name}</Badge>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      id: "specialization",
      header: "Specialization",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm">
          {row.original.specialization ?? "—"}
        </span>
      ),
    },
    {
      id: "qualification",
      header: "Qualification",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {row.original.qualification ?? "—"}
        </span>
      ),
    },
    {
      id: "experience",
      header: "Experience",
      sortKey: "experienceYears",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.experienceYears} yr
        </span>
      ),
      meta: { nowrap: true },
    },
    {
      id: "fee",
      header: "Consultation fee",
      sortKey: "consultationFee",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatCurrency(row.original.consultationFee, currency)}
        </span>
      ),
      meta: { align: "right", nowrap: true },
    },
    {
      id: "rating",
      header: "Rating",
      sortKey: "ratingAverage",
      cell: ({ row }) =>
        row.original.ratingCount > 0 ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star
              className="size-3.5 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            {row.original.ratingAverage.toFixed(1)}
            <span className="text-xs text-muted-foreground">
              ({row.original.ratingCount})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No reviews</span>
        ),
      meta: { nowrap: true },
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
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Doctors"
          description="Clinicians on this center's roster, with department and fees."
          icon={Stethoscope}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Doctors on the roster"
          searchPlaceholder="Search by name, specialization or license…"
          searchLabel="Search doctors"
          filters={filters}
          emptyTitle="No doctors found"
          emptyDescription="Invite a doctor to add them to the roster."
        />
      </PageSection>
    </PageContainer>
  );
}