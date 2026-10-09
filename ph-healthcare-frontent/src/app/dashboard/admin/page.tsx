import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  Stethoscope,
  Users,
} from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { can } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CategoryBarChart,
  CompositionChart,
  MultiLineChart,
  TrendChart,
} from "@/components/charts/charts";
import { AppointmentAgenda, Figure, RecentList } from "@/components/dashboard/agenda";
import { formatCurrencyCompact, formatDate, formatRelative } from "@/lib/utils/format";
import {
  agenda,
  appointmentSummary,
  appointmentsByStatus,
  doctorPerformance,
} from "@/services/appointment.service";
import {
  listRecentPatients,
  patientGrowthSeries,
  patientSummary,
} from "@/services/patient.service";
import { doctorSummary } from "@/services/doctor.service";
import { billingSummary, revenueSeries } from "@/services/billing.service";
import { inventoryAlerts, medicineSummary } from "@/services/medicine.service";
import { labSummary } from "@/services/laboratory.service";
import { departmentPerformance } from "@/services/department.service";

export const metadata: Metadata = { title: "Center overview" };

/**
 * Center administrator dashboard.
 *
 * Every query is scoped to the admin's own center through `user.tenant`; an admin
 * sees their clinic's numbers and nothing else (§36).
 *
 * Tiles and charts are *permission-gated* rather than zero-filled: a center whose
 * role has not been granted billing access should not render a revenue tile at
 * all, because "0.00" reads as "you made nothing" while the truth is "you may not
 * see this".
 */
export default async function AdminDashboard() {
  const { user } = await requireDashboardContext([RoleKey.ADMIN]);

  const currency = user.healthcareCenterCurrency ?? "USD";
  const scope = user.tenant;

  const canBill = can(user, PERMISSIONS.INVOICE_READ);
  const canSeeRevenue = can(user, PERMISSIONS.REPORT_READ);
  const canSeeLab = can(user, PERMISSIONS.LAB_REQUEST_READ);
  const canSeeInventory = can(user, PERMISSIONS.MEDICINE_READ);
  const canSeeAppointments = can(user, PERMISSIONS.APPOINTMENT_READ);

  const windowStart = monthsAgo(6);

  const [
    patients,
    doctors,
    appointments,
    billing,
    lab,
    inventory,
    medicines,
    todayAgenda,
    statusMix,
    performance,
    departments,
    growth,
    revenue,
    recentPatients,
  ] = await Promise.all([
    patientSummary(scope),
    doctorSummary(scope),
    appointmentSummary(scope),
    canBill ? billingSummary(scope, currency) : null,
    canSeeLab ? labSummary(scope) : null,
    canSeeInventory ? inventoryAlerts(scope) : null,
    canSeeInventory ? medicineSummary(scope) : null,
    canSeeAppointments ? agenda(scope, { take: 8 }) : Promise.resolve([]),
    canSeeAppointments
      ? appointmentsByStatus(scope, windowStart, new Date())
      : Promise.resolve([]),
    canSeeAppointments
      ? doctorPerformance(scope, windowStart, new Date(), 6)
      : Promise.resolve([]),
    departmentPerformance(scope, 6),
    patientGrowthSeries(scope, 6),
    canSeeRevenue ? revenueSeries(scope, 6) : null,
    listRecentPatients(scope, 6),
  ]);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={user.healthcareCenterName ?? "Center overview"}
        description={`Operating overview for ${formatDate(new Date())}.`}
        icon={LayoutDashboard}
        actions={
          canSeeAppointments ? (
            <Button size="sm" render={<Link href="/dashboard/admin/appointments" />}>
              <CalendarDays className="mr-2 size-4" aria-hidden="true" />
              Appointments
            </Button>
          ) : null
        }
      />

      <section
        aria-label="Today at a glance"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Today's appointments"
          value={appointments.todayTotal}
          hint={`${appointments.todayCompleted} completed · ${appointments.todayCancelled} cancelled or no-show`}
          icon={CalendarCheck}
        />
        <StatCard
          label="Upcoming appointments"
          value={appointments.upcoming}
          hint="Still to start and not yet closed"
          icon={CalendarDays}
        />
        <StatCard
          label="Registered patients"
          value={patients.total}
          hint={`${patients.newThisMonth} joined this month`}
          icon={Users}
        />
        <StatCard
          label="Active doctors"
          value={doctors.active}
          hint={`${doctors.total} on the roster`}
          icon={Stethoscope}
        />
      </section>

      {canSeeRevenue && billing ? (
        <section aria-label="Finance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenue this month"
            value={formatCurrencyCompact(billing.monthRevenue, currency)}
            hint={`${billing.monthInvoiceCount} invoices issued`}
            icon={Banknote}
            tone="positive"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrencyCompact(billing.outstandingAmount, currency)}
            hint={`${billing.outstandingCount} unpaid invoices`}
            icon={CreditCard}
            tone={billing.outstandingAmount > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Overdue invoices"
            value={billing.overdueCount}
            hint="Past the due date"
            icon={AlertTriangle}
            tone={billing.overdueCount > 0 ? "negative" : "default"}
          />
          <StatCard
            label="All invoices"
            value={billing.invoiceCount}
            hint="Every status"
            icon={Receipt}
          />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {canSeeRevenue && revenue ? (
          <TrendChart
            title="Revenue"
            description={`Invoiced per month in ${currency}`}
            data={revenue.points}
            valueFormat={{ kind: "compactCurrency", currency }}
            height="h-72"
          />
        ) : (
          <TrendChart
            title="Patient growth"
            description="Registrations per month"
            data={growth.points}
            height="h-72"
          />
        )}

        {canSeeAppointments ? (
          <CompositionChart
            title="Appointment outcomes"
            description="Last 6 months, by status"
            data={statusMix}
            height="h-72"
          />
        ) : (
          <TrendChart
            title="Patient growth"
            description="Registrations per month"
            data={growth.points}
            height="h-72"
          />
        )}
      </div>

      {canSeeAppointments ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <MultiLineChart
            title="Doctors by completed consultations"
            description="Last 6 months"
            data={performance.map((row) => ({
              label: row.label,
              completed: row.value,
            }))}
            series={["completed"]}
            height="h-72"
          />

          <CategoryBarChart
            title="Busiest departments"
            description="All-time appointment volume"
            data={departments.map((row) => ({
              label: row.label,
              value: row.appointments,
            }))}
            height="h-72"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="today-agenda" className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="today-agenda" className="text-sm font-semibold">
              Today&apos;s schedule
            </h2>
            {canSeeAppointments ? (
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/admin/appointments" />}
              >
                View all
              </Button>
            ) : null}
          </div>

          {canSeeAppointments ? (
            <AppointmentAgenda
              appointments={todayAgenda}
              emptyTitle="Nothing booked for today"
              emptyDescription="Appointments appear here as they are booked."
            />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Appointments are not visible to your role"
              description="Ask a center administrator for the appointment permission."
            />
          )}
        </section>

        <div className="space-y-4">
          <section aria-labelledby="recent-patients">
            <h2 id="recent-patients" className="mb-2 text-sm font-semibold">
              Recently registered
            </h2>
            <RecentList
              items={recentPatients}
              getKey={(row) => row.id}
              emptyTitle="No patients yet"
              renderItem={(row) => (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.code}
                      {row.phone ? ` · ${row.phone}` : ""}
                    </p>
                  </div>
                  <Figure value={formatRelative(row.registeredAt)} />
                </div>
              )}
            />
          </section>

          {lab ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FlaskConical
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Laboratory queue
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center">
                <QueueFigure label="Awaiting" value={lab.pending} />
                <QueueFigure label="In progress" value={lab.inProgress} />
                <QueueFigure label="Completed" value={lab.completed} />
              </CardContent>
            </Card>
          ) : null}

          {inventory ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Pill className="size-4 text-muted-foreground" aria-hidden="true" />
                  Inventory alerts
                  {medicines ? (
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {medicines.total} formulary items
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inventory.lowStock.length === 0 && inventory.expiring.length === 0 ? (
                  <EmptyState
                    icon={Pill}
                    title="Stock levels are healthy"
                    className="border-0 py-6"
                  />
                ) : (
                  <ul className="space-y-1.5">
                    {inventory.lowStock.slice(0, 4).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <StatusBadge status="LOW" label="Low" className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                        <Figure value={`${item.onHand}/${item.minimum}`} />
                      </li>
                    ))}
                    {inventory.expiring.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <StatusBadge
                          status="HIGH"
                          label="Expiry"
                          className="shrink-0"
                        />
                        <span className="truncate">{item.label}</span>
                        <Figure
                          value={item.expiresOn ? formatDate(item.expiresOn) : "—"}
                          caption={item.batchNumber ?? undefined}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Revenue shown in the center&apos;s own currency ({currency}). Totals are
        computed on the server from stored invoice rows — this screen never
        recalculates them.
      </p>
    </PageContainer>
  );
}

function QueueFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border py-2">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function monthsAgo(months: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
}
