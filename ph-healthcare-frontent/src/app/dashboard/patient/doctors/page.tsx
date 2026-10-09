import type { Metadata } from "next";
import { Star, Stethoscope } from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { parseListParams } from "@/lib/api/list-params";
import { listDepartmentOptions } from "@/services/department.service";
import { listDoctors } from "@/services/doctor.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatCurrency, initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Find a doctor" };

/**
 * The public-facing doctor directory inside the patient area.
 *
 * A patient holds `doctor:read`, so this list is available to them — choosing
 * someone to book with is not privileged information. What it deliberately does
 * not include is the doctor's schedule, caseload or revenue: those are operations
 * data and live behind separate permissions.
 */
export default async function PatientDoctorsPage({
  searchParams,
}: PageProps<"/dashboard/patient/doctors">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.DOCTOR_READ);

  const currency = user.healthcareCenterCurrency ?? "USD";

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["name", "experienceYears", "ratingAverage", "consultationFee"],
    fallbackSort: "name",
    defaultOrder: "asc",
    filterKeys: ["departmentId"],
  });

  const [page, departments] = await Promise.all([
    listDoctors(user.tenant, query, { onlyActive: true }),
    listDepartmentOptions(user.tenant),
  ]);

  const filters: TableFilterConfig[] = [
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
          <Avatar className="size-9 shrink-0">
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
              {row.original.specialization ?? row.original.code}
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
          <span className="text-muted-foreground">—</span>
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
          <span className="text-muted-foreground">New</span>
        ),
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Find a doctor"
          description="Clinicians available at your healthcare center, with fees and patient ratings."
          icon={Stethoscope}
        />

        {page.total === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No doctors match your search"
            description="Try a different name or clear the department filter."
          />
        ) : (
          <ServerDataTable<Row>
            columns={columns}
            data={page.items}
            total={page.total}
            sort={query.sort}
            order={query.order}
            getRowId={(row) => row.id}
            caption="Doctors available at this center"
            searchPlaceholder="Search by name or specialization…"
            searchLabel="Search doctors"
            filters={filters}
            emptyTitle="No doctors match your search"
            emptyDescription="Try a different name or clear the department filter."
          />
        )}

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Ratings come from patients who left a review after a completed
              appointment. Booking opens from the appointment screen once you have
              chosen a doctor.
            </p>
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
}