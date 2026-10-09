import type { Metadata } from "next";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

import { RecordStatus, RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { listDepartments } from "@/services/department.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Departments" };

/**
 * Department cards rather than a table.
 *
 * A department is described by a handful of prose fields and two counts — there is
 * no date to sort on and nothing to paginate for a single clinic's worth of
 * departments. A card grid reads better than a two-column table of mostly-empty
 * cells, and it gives room for the description.
 *
 * Departments come from the database; nothing here is hardcoded (§12).
 */
export default async function AdminDepartmentsPage() {
  const { user } = await requireDashboardContext([RoleKey.ADMIN]);
  requirePermission(user, PERMISSIONS.DEPARTMENT_READ);

  const departments = await listDepartments(user.tenant);

  const active = departments.filter((d) => d.status === RecordStatus.ACTIVE);
  const inactive = departments.filter((d) => d.status !== RecordStatus.ACTIVE);

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Departments"
          description="Clinical units in this center. Each doctor belongs to at most one."
          icon={Building2}
        />

        {departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Departments are configured per center and appear here once created."
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>

        {inactive.length > 0 ? (
          <>
            <h2 className="pt-2 text-sm font-semibold text-muted-foreground">
              Inactive
            </h2>
            <div className="grid gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
              {inactive.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </div>
          </>
        ) : null}
      </PageSection>
    </PageContainer>
  );
}

function DepartmentCard({
  department,
}: {
  department: Awaited<ReturnType<typeof listDepartments>>[number];
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{department.name}</h3>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {department.code}
            </p>
          </div>
          <StatusBadge status={department.status} />
        </div>

        {department.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {department.description}
          </p>
        ) : null}

        <dl className="mt-auto space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
            <dd className="truncate">{department.phone ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
            <dd className="truncate">{department.email ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <dd className="truncate">{department.location ?? "—"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {department.doctorCount} doctor{department.doctorCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {department.appointmentCount} appointment
            {department.appointmentCount === 1 ? "" : "s"}
          </span>
          {department.headDoctor ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              Head: {department.headDoctor.name}
            </span>
          ) : null}
          {department.defaultConsultationFee !== null ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
              Default fee {department.defaultConsultationFee}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}