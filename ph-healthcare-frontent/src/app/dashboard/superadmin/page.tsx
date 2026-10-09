import type { Metadata } from "next";
import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { can } from "@/lib/authz/session";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendChart } from "@/components/charts/charts";
import { Figure, RecentList } from "@/components/dashboard/agenda";
import { formatRelative, humanize } from "@/lib/utils/format";
import { platformSummary, recentAuditLogs, recentUsers } from "@/services/user.service";
import { appointmentsByStatus } from "@/services/appointment.service";
import { toMonthlySeries } from "@/services/_shared";

export const metadata: Metadata = { title: "Platform overview" };

/**
 * Superadmin dashboard.
 *
 * The only screen in the product that is not scoped to a single tenant: a
 * superadmin's `healthcareCenterId` is null, and `scopeToCenter` reads that as "no
 * tenant restriction" (§36).
 *
 * Deliberately *not* shown here: a pooled revenue figure. Centers price in their
 * own currency and the system performs no FX conversion, so a single "platform
 * revenue" number would be a conversion it does not model. Revenue is read per
 * center instead, from the admin dashboard for that center.
 */
export default async function SuperadminDashboard() {
  const { user } = await requireDashboardContext([RoleKey.SUPERADMIN]);

  const canReadAudit = can(user, PERMISSIONS.AUDIT_LOG_READ);
  const canReadUsers = can(user, PERMISSIONS.USER_READ);

  const windowStart = monthsAgo(12);

  const [summary, statusMix, recentNewUsers, recentAudit, appointmentRows] =
    await Promise.all([
      platformSummary(),
      appointmentsByStatus(user.tenant, windowStart, new Date()),
      canReadUsers ? recentUsers(6) : Promise.resolve([]),
      canReadAudit ? recentAuditLogs(8) : Promise.resolve([]),
      prisma.appointment.findMany({
        where: { startAt: { gte: windowStart } },
        select: { startAt: true },
        take: 20_000,
      }),
    ]);

  const appointmentSeries = toMonthlySeries(
    appointmentRows,
    12,
    (row) => row.startAt,
    () => 1,
    "Appointments",
  );

  const mixTotal = statusMix.reduce((sum, row) => sum + row.value, 0);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={`Platform overview`}
        description={`Signed in as ${user.name}. Every figure below spans all healthcare centers.`}
        icon={Activity}
      />

      <section
        aria-label="Platform totals"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Healthcare centers"
          value={summary.centers}
          hint={`${summary.activeCenters} accepting registrations`}
          icon={Building2}
        />
        <StatCard
          label="Center administrators"
          value={summary.admins}
          hint="Accounts with centre-scoped access"
          icon={UserCog}
        />
        <StatCard
          label="New accounts this month"
          value={summary.newUsers}
          hint="All roles combined"
          icon={UserPlus}
          tone="positive"
        />
        <StatCard
          label="Doctors on the platform"
          value={summary.doctors}
          hint="Registered across all centers"
          icon={Stethoscope}
        />
      </section>

      <section
        aria-label="Workload totals"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Patients"
          value={summary.patients}
          hint="All time"
          icon={Users}
        />
        <StatCard
          label="Appointments"
          value={summary.appointments}
          hint="All time"
          icon={CalendarDays}
        />
        <StatCard
          label="Appointments, last 12 months"
          value={appointmentRows.length}
          hint="Counted at the database"
          icon={CalendarDays}
        />
        <StatCard
          label="Status mix"
          value={mixTotal}
          hint="Appointments in the 12-month window"
          icon={CheckCircle2}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <TrendChart
          className="lg:col-span-3"
          title="Appointment volume"
          description="Bookings per month across all centers"
          data={appointmentSeries.points}
          height="h-72"
        />

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Status mix, last 12 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusMix.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No appointments in this window yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {statusMix
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((row) => (
                    <li key={row.label} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={row.label} className="shrink-0" />
                        <Figure
                          value={row.value}
                          caption={
                            mixTotal === 0
                              ? undefined
                              : `${Math.round((row.value / mixTotal) * 100)}%`
                          }
                        />
                      </div>
                      <Progress
                        value={mixTotal === 0 ? 0 : (row.value / mixTotal) * 100}
                        aria-label={`${humanize(row.label)} share of appointments`}
                      />
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="recent-users">
          <h2 id="recent-users" className="mb-2 text-sm font-semibold">
            Recent registrations
          </h2>
          <RecentList
            items={recentNewUsers}
            getKey={(row) => row.id}
            emptyTitle="No accounts have been created yet"
            renderItem={(row) => (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.email ?? row.code}
                    {row.healthcareCenter ? ` · ${row.healthcareCenter.name}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{humanize(row.role?.key ?? "PATIENT")}</Badge>
                <Figure value={formatRelative(row.createdAt)} />
              </div>
            )}
          />
        </section>

        <section aria-labelledby="recent-audit">
          <h2
            id="recent-audit"
            className="mb-2 flex items-center gap-2 text-sm font-semibold"
          >
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            Recent system activity
          </h2>
          <RecentList
            items={recentAudit}
            getKey={(row) => row.id}
            emptyTitle="No activity recorded yet"
            renderItem={(row) => (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{humanize(row.action)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.user?.name ?? "System"}
                    {row.healthcareCenter ? ` · ${row.healthcareCenter.name}` : ""}
                  </p>
                </div>
                <StatusBadge
                  status={row.succeeded ? "COMPLETED" : "CANCELLED"}
                  label={row.succeeded ? "OK" : "Denied"}
                  className="shrink-0"
                />
                <Figure value={formatRelative(row.createdAt)} />
              </div>
            )}
          />
        </section>
      </div>
    </PageContainer>
  );
}

function monthsAgo(months: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
}