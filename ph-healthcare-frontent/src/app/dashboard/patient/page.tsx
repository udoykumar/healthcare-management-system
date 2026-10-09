import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Receipt,
  Stethoscope,
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
import { AppointmentAgenda, Figure, RecentList } from "@/components/dashboard/agenda";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  humanize,
} from "@/lib/utils/format";
import { agenda } from "@/services/appointment.service";
import { getPatientForActor } from "@/services/patient.service";
import {
  activeMedications,
  listPrescriptions,
} from "@/services/prescription.service";
import { listLabResults, listLabRequests } from "@/services/laboratory.service";
import { currentDiagnoses } from "@/services/medical-record.service";
import { listInvoices, patientOutstanding } from "@/services/billing.service";
import { listNotifications } from "@/services/notification.service";
import { addDays, startOfToday } from "@/services/_shared";

export const metadata: Metadata = { title: "My health overview" };

/**
 * Patient dashboard.
 *
 * Written in the second person and ordered by what someone actually wants to
 * know: what is my next appointment, is anything owed, what am I taking, and is a
 * result waiting.
 *
 * Read-only by construction. There is no control on this page that writes a
 * clinical record — a patient cannot edit a consultation, a diagnosis or a
 * prescription, and the server rejects such a request regardless of what the
 * browser sends (§6, §58).
 */
export default async function PatientDashboard() {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);

  const patientId = user.patientId;
  if (!patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const scope = user.tenant;
  const currency = user.healthcareCenterCurrency ?? "USD";

  const canSeeHistory = can(user, PERMISSIONS.RECORD_READ_OWN);
  const canSeeLab = can(user, PERMISSIONS.LAB_RESULT_READ_OWN);
  const canSeePrescriptions = can(user, PERMISSIONS.PRESCRIPTION_READ_OWN);
  const canSeeBilling = can(user, PERMISSIONS.INVOICE_READ_OWN);

  const now = new Date();

  const [
    patient,
    nextAppointments,
    prescriptions,
    medicines,
    labReports,
    labRequests,
    invoices,
    outstanding,
    diagnoses,
    notifications,
  ] = await Promise.all([
    getPatientForActor(scope, patientId),
    agenda(scope, { from: startOfToday(), to: addDays(startOfToday(), 60), take: 6 }),
    canSeePrescriptions
      ? listPrescriptions(scope, RECENT_PRESCRIPTIONS)
      : Promise.resolve({ items: [] }),
    activeMedications(scope, patientId),
    canSeeLab ? listLabResults(scope, RECENT_LAB_RESULTS) : Promise.resolve({ items: [] }),
    canSeeLab ? listLabRequests(scope, RECENT_LAB_REQUESTS) : Promise.resolve({ items: [] }),
    canSeeBilling ? listInvoices(scope, RECENT_INVOICES) : Promise.resolve({ items: [] }),
    canSeeBilling ? patientOutstanding(scope) : Promise.resolve(null),
    canSeeHistory ? currentDiagnoses(scope, patientId) : Promise.resolve([]),
    listNotifications(user.id, RECENT_NOTIFICATIONS),
  ]);

  const nextAppointment = nextAppointments[0] ?? null;
  const allergyCount = patient.allergies.length;

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={`Hello, ${patient.firstName}`}
        description={`Your appointments, results and bills at ${
          user.healthcareCenterName ?? "your center"
        }.`}
        icon={LayoutDashboard}
        actions={
          <Button size="sm" render={<Link href="/dashboard/patient/doctors" />}>
            <Stethoscope className="mr-2 size-4" aria-hidden="true" />
            Find a doctor
          </Button>
        }
      />

      {/*
        Allergies sit above everything else. A patient arriving to book or read a
        prescription needs to see them before the clinical details, not buried in a
        profile tab.
      */}
      {allergyCount > 0 ? (
        <Alert variant="destructive">
          <HeartPulse className="size-4" aria-hidden="true" />
          <AlertTitle>
            {allergyCount} recorded allerg{allergyCount === 1 ? "y" : "ies"}
          </AlertTitle>
          <AlertDescription>
            {patient.allergies.map((allergy) => allergy.substance).join(", ")}.
            Tell any clinician you see before they prescribe.
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="At a glance"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Next appointment"
          value={
            nextAppointment ? formatDate(nextAppointment.startAt) : "None booked"
          }
          hint={
            nextAppointment
              ? `${formatDateTime(nextAppointment.startAt)} · ${nextAppointment.doctor.name}`
              : "Book with a doctor to get started"
          }
          icon={CalendarDays}
        />
        <StatCard
          label="Upcoming appointments"
          value={nextAppointments.length}
          hint="Next 60 days"
          icon={CalendarDays}
        />
        <StatCard
          label="Outstanding balance"
          value={
            outstanding ? formatCurrency(outstanding.dueAmount, currency) : "—"
          }
          hint={
            outstanding
              ? `${outstanding.invoiceCount} unpaid invoice${
                  outstanding.invoiceCount === 1 ? "" : "s"
                }`
              : "Billing not available"
          }
          icon={Receipt}
          tone={
            outstanding && outstanding.dueAmount > 0 ? "warning" : "default"
          }
        />
        <StatCard
          label="Unread notifications"
          value={notifications.total}
          hint="Reminders and results"
          icon={Bell}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="my-appointments" className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="my-appointments" className="text-sm font-semibold">
              Upcoming appointments
            </h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard/patient/appointments" />}
            >
              View all
            </Button>
          </div>
          <AppointmentAgenda
            appointments={nextAppointments}
            emphasise="doctor"
            emptyTitle="No upcoming appointments"
            emptyDescription="Book with a doctor to see your appointments here."
          />
        </section>

        <section aria-labelledby="my-medicines">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="my-medicines" className="text-sm font-semibold">
              Current medications
            </h2>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {medicines.length === 0 ? (
                <EmptyState
                  icon={Pill}
                  title="No medications recorded"
                  description="Prescriptions your doctor issues appear here."
                  className="border-0 py-8"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {medicines.slice(0, 6).map((item) => (
                    <li key={item.id} className="px-4 py-3">
                      <p className="truncate text-sm font-medium">
                        {item.medicineName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.dosage} · {frequencyText(item)} · {item.duration}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.prescription.doctor.user.name} ·{" "}
                        {formatDate(item.prescription.prescribedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {canSeePrescriptions ? (
          <section aria-labelledby="my-prescriptions">
            <h2 id="my-prescriptions" className="mb-2 text-sm font-semibold">
              Recent prescriptions
            </h2>
            <RecentList
              items={prescriptions.items}
              getKey={(row) => row.id}
              emptyTitle="No prescriptions yet"
              renderItem={(row) => (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.code}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.doctor.name} · {row.items.length} medicine
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

        {canSeeLab ? (
          <section aria-labelledby="my-results">
            <h2 id="my-results" className="mb-2 text-sm font-semibold">
              Recent lab reports
            </h2>
            <RecentList
              items={labReports.items}
              getKey={(row) => (row as { id: string }).id}
              emptyTitle="No results published yet"
              emptyDescription="Reports appear here once the laboratory verifies them."
              renderItem={(row) => {
                const report = row as {
                  id: string;
                  code: string;
                  overallStatus: string;
                  reportedAt: Date;
                  test: { name: string };
                };
                return (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {report.test.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {report.code}
                      </p>
                    </div>
                    <StatusBadge
                      status={report.overallStatus}
                      label={report.overallStatus === "NONE" ? "Normal" : undefined}
                      className="shrink-0"
                    />
                    <Figure value={formatRelative(report.reportedAt)} />
                  </div>
                );
              }}
            />
          </section>
        ) : null}

        {canSeeBilling ? (
          <section aria-labelledby="my-invoices">
            <h2 id="my-invoices" className="mb-2 text-sm font-semibold">
              Recent invoices
            </h2>
            <RecentList
              items={invoices.items}
              getKey={(row) => row.id}
              emptyTitle="No invoices yet"
              renderItem={(row) => (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.invoiceNumber}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.doctor ? row.doctor.name : "Center services"}
                    </p>
                  </div>
                  <StatusBadge status={row.status} className="shrink-0" />
                  <Figure value={formatCurrency(row.totalAmount, row.currency)} />
                </div>
              )}
            />
          </section>
        ) : null}
      </div>

      {canSeeHistory && diagnoses.length > 0 ? (
        <section aria-labelledby="my-diagnoses">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="my-diagnoses" className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              Diagnoses on my record
            </h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/dashboard/patient/medical-history" />}
            >
              Full history
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-wrap gap-2">
                {diagnoses.slice(0, 12).map((diagnosis) => (
                  <li key={diagnosis.id}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                      <span className="font-medium">{diagnosis.description}</span>
                      <span className="text-muted-foreground">
                        {formatDate(diagnosis.diagnosedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Recorded by your clinician on {formatDate(now)}. Contact the center
                if you believe something here is wrong.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {canSeeLab && labRequests.items.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" />
              Tests in progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {labRequests.items.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <StatusBadge status={request.status} className="shrink-0" />
                  <span className="truncate">
                    {request.tests.map((test) => test.name).join(", ")}
                  </span>
                  <Figure value={formatRelative(request.requestedAt)} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="You are all caught up"
              className="border-0 py-6"
            />
          ) : (
            <ul className="space-y-2">
              {notifications.items.map((notification) => (
                <li key={notification.id} className="flex items-start gap-3">
                  <span
                    className={
                      notification.readAt
                        ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent"
                        : "mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                    }
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge
                    status={notification.type === "LAB_REPORT_AVAILABLE" ? "COMPLETED" : "PENDING"}
                    label={humanize(notification.type)}
                    className="shrink-0"
                  />
                  <Figure value={formatRelative(notification.createdAt)} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function frequencyText(item: {
  frequency: string;
  frequencyText: string | null;
}): string {
  return item.frequencyText ?? humanize(item.frequency);
}

/**
 * Fixed internal list queries.
 *
 * These are not URL-driven — the dashboard has no list controls — so they are
 * literal `ListQuery` values rather than going through `parseListParams`.
 */
const BASE_QUERY = {
  page: 1,
  pageSize: 5,
  search: undefined,
  sort: "",
  order: "desc" as const,
  skip: 0,
  take: 5,
  orderBy: {},
  filters: {},
};

const RECENT_PRESCRIPTIONS = {
  ...BASE_QUERY,
  sort: "prescribedAt",
  orderBy: { prescribedAt: "desc" as const },
};

const RECENT_LAB_RESULTS = {
  ...BASE_QUERY,
  sort: "reportedAt",
  orderBy: { reportedAt: "desc" as const },
};

const RECENT_LAB_REQUESTS = {
  ...BASE_QUERY,
  sort: "requestedAt",
  orderBy: { requestedAt: "desc" as const },
};

const RECENT_INVOICES = {
  ...BASE_QUERY,
  sort: "createdAt",
  orderBy: { createdAt: "desc" as const },
};

const RECENT_NOTIFICATIONS = {
  ...BASE_QUERY,
  sort: "createdAt",
  orderBy: { createdAt: "desc" as const },
};