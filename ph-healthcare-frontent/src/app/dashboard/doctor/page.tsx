import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Stethoscope,
  Users,
} from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { AppError } from "@/lib/api/errors";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { can } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompositionChart } from "@/components/charts/charts";
import { AppointmentAgenda, Figure, RecentList } from "@/components/dashboard/agenda";
import { formatDate, formatRelative } from "@/lib/utils/format";
import {
  agenda,
  appointmentSummary,
  appointmentsByStatus,
} from "@/services/appointment.service";
import { listDoctorPatients } from "@/services/patient.service";
import { listPrescriptions } from "@/services/prescription.service";
import { labSummary, listLabRequests } from "@/services/laboratory.service";
import { doctorRecordSummary } from "@/services/medical-record.service";
import { addDays, startOfToday } from "@/services/_shared";

export const metadata: Metadata = { title: "Clinical dashboard" };

/**
 * Doctor dashboard.
 *
 * Organised around the clinic day rather than around centre statistics: what is
 * next, what is waiting to be seen, what has not been documented, and which lab
 * reports have come back.
 *
 * Every service called here applies the doctor's own identity as a filter — a
 * doctor with `patient:read-own` but no centre-wide read cannot widen their view
 * through this page, because the scoping lives in the service, not here (§5, §36).
 */
export default async function DoctorDashboard() {
  const { user } = await requireDashboardContext([RoleKey.DOCTOR]);

  const doctorId = user.doctorId;
  if (!doctorId) {
    // A doctor role with no Doctor profile is a broken account, not an empty one.
    throw AppError.forbidden(
      "This account is not linked to a doctor profile. Contact your administrator.",
      "NO_DOCTOR_PROFILE",
    );
  }

  const scope = user.tenant;
  const now = new Date();

  const canReadLab = can(user, PERMISSIONS.LAB_RESULT_READ);
  const canReadPrescriptions = can(user, PERMISSIONS.PRESCRIPTION_READ);
  const canReadPatients = can(user, PERMISSIONS.PATIENT_READ_OWN);

  const [
    appointments,
    records,
    todayAgenda,
    upcomingAgenda,
    statusMix,
    recentPatients,
    prescriptions,
    lab,
    labQueue,
  ] = await Promise.all([
    appointmentSummary(scope),
    doctorRecordSummary(scope, doctorId),
    agenda(scope, { take: 8 }),
    agenda(scope, { from: addDays(startOfToday(), 1), to: addDays(startOfToday(), 8), take: 6 }),
    appointmentsByStatus(scope, monthsAgo(6), now),
    canReadPatients ? listDoctorPatients(scope, PATIENTS_QUERY) : Promise.resolve({ items: [] }),
    canReadPrescriptions
      ? listPrescriptions(scope, PRESCRIPTIONS_QUERY)
      : Promise.resolve({ items: [] }),
    canReadLab ? labSummary(scope) : null,
    canReadLab ? listLabRequests(scope, LAB_REQUESTS_QUERY) : Promise.resolve({ items: [] }),
  ]);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={`Good day, ${firstName(user.name)}`}
        description={`Your clinical day for ${formatDate(now)}.`}
        icon={LayoutDashboard}
        actions={
          <Button size="sm" render={<Link href="/dashboard/doctor/appointments" />}>
            <CalendarCheck className="mr-2 size-4" aria-hidden="true" />
            My appointments
          </Button>
        }
      />

      <section
        aria-label="Today at a glance"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Today's appointments"
          value={appointments.todayTotal}
          hint={`${appointments.todayCompleted} completed`}
          icon={CalendarCheck}
        />
        <StatCard
          label="Upcoming appointments"
          value={appointments.upcoming}
          hint="Next 8 days"
          icon={CalendarClock}
        />
        <StatCard
          label="Patients in your care"
          value={records.patients}
          hint="People you have an appointment with"
          icon={Users}
        />
        <StatCard
          label="Consultations recorded"
          value={records.records}
          hint={`${records.todayRecords} today`}
          icon={ClipboardList}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="today-list" className="lg:col-span-2">
          <h2 id="today-list" className="mb-2 text-sm font-semibold">
            Today&apos;s list
          </h2>
          <AppointmentAgenda
            appointments={todayAgenda}
            emphasise="patient"
            emptyTitle="No appointments today"
            emptyDescription="Your next booked appointment will appear here."
          />
        </section>

        <section aria-labelledby="next-up">
          <h2 id="next-up" className="mb-2 text-sm font-semibold">
            Next 8 days
          </h2>
          <AppointmentAgenda
            appointments={upcomingAgenda}
            emphasise="patient"
            emptyTitle="Nothing booked ahead"
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {canReadPrescriptions ? (
          <section aria-labelledby="recent-prescriptions" className="lg:col-span-2">
            <h2 id="recent-prescriptions" className="mb-2 text-sm font-semibold">
              Recent prescriptions
            </h2>
            <RecentList
              items={prescriptions.items}
              getKey={(row) => row.id}
              emptyTitle="No prescriptions written yet"
              renderItem={(row) => (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.code}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.patient.name} · {row.items.length} medicine
                      {row.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusBadge status={row.status} className="shrink-0" />
                  <Figure value={formatRelative(row.prescribedAt)} />
                </div>
              )}
            />
          </section>
        ) : null}

        <div className={canReadPrescriptions ? "lg:col-span-3" : "lg:col-span-5"}>
          <CompositionChart
            title="Your appointment outcomes"
            description="Last 6 months"
            data={statusMix}
            height="h-72"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {canReadPatients ? (
          <section aria-labelledby="recent-patients" className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="recent-patients" className="text-sm font-semibold">
                Recently seen
              </h2>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/doctor/patients" />}
              >
                My patients
              </Button>
            </div>
            <RecentList
              items={recentPatients.items}
              getKey={(row) => row.id}
              emptyTitle="No patients yet"
              emptyDescription="Patients appear here once you have an appointment with them."
              renderItem={(row) => (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.code} · {row.visitCount} visit
                      {row.visitCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Figure
                    value={
                      "lastVisitAt" in row && row.lastVisitAt
                        ? formatRelative(row.lastVisitAt)
                        : "—"
                    }
                  />
                </div>
              )}
            />
          </section>
        ) : null}

        {lab ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                Laboratory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniFigure label="Awaiting" value={lab.pending} />
                <MiniFigure label="Processing" value={lab.inProgress} />
                <MiniFigure label="Reported" value={lab.completed} />
              </div>

              <ul className="space-y-1.5">
                {labQueue.items.slice(0, 4).map((request) => (
                  <li key={request.id} className="flex items-center gap-2 text-sm">
                    <StatusBadge status={request.status} className="shrink-0" />
                    <span className="truncate">{request.patient.name}</span>
                    <Figure value={formatRelative(request.requestedAt)} />
                  </li>
                ))}
                {labQueue.items.length === 0 ? (
                  <EmptyState
                    icon={FlaskConical}
                    title="No lab requests"
                    className="border-0 py-4"
                  />
                ) : null}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Stethoscope className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        This system records and reports clinical information. Diagnosis and
        treatment decisions remain yours.
      </p>
    </PageContainer>
  );
}

function MiniFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border py-1.5">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function monthsAgo(months: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
}

/**
 * Fixed internal list queries.
 *
 * These are not URL-driven — the doctor dashboard has no controls — so they are
 * literal `ListQuery` values rather than going through `parseListParams`. The sort
 * column still has to be named explicitly, and it has to be a column of the model
 * being queried: Prisma rejects an `orderBy` key that is not a real field, which is
 * why these are three separate constants rather than one object with an overridden
 * `orderBy`.
 */
const PATIENTS_QUERY = {
  page: 1,
  pageSize: 6,
  search: undefined,
  sort: "registeredAt",
  order: "desc" as const,
  skip: 0,
  take: 6,
  orderBy: { registeredAt: "desc" as const },
  filters: {},
};

const PRESCRIPTIONS_QUERY = {
  ...PATIENTS_QUERY,
  sort: "prescribedAt",
  orderBy: { prescribedAt: "desc" as const },
};

const LAB_REQUESTS_QUERY = {
  ...PATIENTS_QUERY,
  sort: "requestedAt",
  orderBy: { requestedAt: "desc" as const },
};
