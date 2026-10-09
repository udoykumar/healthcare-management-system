import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Pill,
  Receipt,
  Stethoscope,
} from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { AppError } from "@/lib/api/errors";
import { currentDiagnoses, patientTimeline } from "@/services/medical-record.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge, AbnormalFlagBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Medical history" };

/**
 * The patient's whole clinical history as one timeline (§15).
 *
 * Every entry comes from a record a clinician wrote. Nothing on this page can be
 * edited from the patient side, and the diagnoses list shows only non-superseded
 * entries while keeping the superseded ones in the database — a correction adds a
 * diagnosis rather than overwriting the original (§16).
 *
 * Access is checked twice: the role guard here, and `assertPatientReadable` inside
 * the service, which pins a PATIENT to their own id.
 */
export default async function PatientMedicalHistoryPage() {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.RECORD_READ_OWN);

  if (!user.patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const scope = user.tenant;
  const [timeline, diagnoses] = await Promise.all([
    patientTimeline(scope, user.patientId, { limit: 40 }),
    currentDiagnoses(scope, user.patientId),
  ]);

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Medical history"
          description="Your consultations, prescriptions, tests and invoices, newest first."
          icon={ClipboardList}
        />

        {diagnoses.length > 0 ? (
          <section aria-labelledby="current-diagnoses">
            <h2 id="current-diagnoses" className="mb-2 text-sm font-semibold">
              Current diagnoses
            </h2>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {diagnoses.map((diagnosis) => (
                    <li
                      key={diagnosis.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <StatusBadge status={diagnosis.type} />
                      <span className="font-medium">{diagnosis.description}</span>
                      {diagnosis.icd10Code ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {diagnosis.icd10Code}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {diagnosis.doctor.user.name} ·{" "}
                        {formatDate(diagnosis.diagnosedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {timeline.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing on your record yet"
            description="Your history builds up as you attend appointments."
          />
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {timeline.map((entry) => (
              <li key={`${entry.kind}-${String((entry.data as { id?: string }).id)}`} className="relative">
                <span
                  className="absolute -left-[27px] top-2 flex size-3 items-center justify-center rounded-full border-2 border-background bg-primary"
                  aria-hidden="true"
                />
                <TimelineCard entry={entry} />
              </li>
            ))}
          </ol>
        )}

        <p className="text-xs text-muted-foreground">
          This record is maintained by the clinicians who treated you. If you believe
          something is missing or wrong, contact{" "}
          <Link href="/dashboard/patient/notifications" className="underline underline-offset-4">
            your healthcare center
          </Link>
          .
        </p>
      </PageSection>
    </PageContainer>
  );
}

/**
 * One timeline entry.
 *
 * A switch rather than a set of separate components because the timeline is a
 * single visual list; giving each kind its own card style would fragment it.
 */
function TimelineCard({
  entry,
}: {
  entry: Awaited<ReturnType<typeof patientTimeline>>[number];
}) {
  const data = entry.data as Record<string, never> & {
    id: string;
    code?: string;
    status?: string;
    [key: string]: unknown;
  };

  if (entry.kind === "appointment") {
    const row = data as unknown as {
      id: string;
      appointmentNumber: string;
      status: string;
      type: string;
      reason: string | null;
      startAt: Date;
      doctor: { user: { name: string } };
    };

    return (
      <EntryCard
        icon={CalendarDays}
        title={`Appointment with ${row.doctor.user.name}`}
        subtitle={`${row.appointmentNumber} · ${humanize(row.type)}`}
        date={entry.at}
        status={row.status}
      >
        {row.reason ? <p className="text-sm">{row.reason}</p> : null}
      </EntryCard>
    );
  }

  if (entry.kind === "record") {
    const row = data as unknown as {
      id: string;
      code: string;
      chiefComplaint: string | null;
      treatmentPlan: string | null;
      clinicalNotes: string | null;
      followUpDate: Date | null;
      doctor: { user: { name: string } };
      diagnoses: { description: string; type: string }[];
    };

    return (
      <EntryCard
        icon={Stethoscope}
        title="Consultation"
        subtitle={`${row.code} · ${row.doctor.user.name}`}
        date={entry.at}
      >
        {row.chiefComplaint ? (
          <p className="text-sm">
            <span className="font-medium">Complaint: </span>
            {row.chiefComplaint}
          </p>
        ) : null}
        {row.diagnoses.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {row.diagnoses.map((diagnosis) => (
              <Badge key={diagnosis.description} variant="secondary">
                {diagnosis.description}
              </Badge>
            ))}
          </div>
        ) : null}
        {row.treatmentPlan ? (
          <p className="text-sm">
            <span className="font-medium">Treatment plan: </span>
            {row.treatmentPlan}
          </p>
        ) : null}
        {row.clinicalNotes ? (
          <p className="text-sm text-muted-foreground">{row.clinicalNotes}</p>
        ) : null}
        {row.followUpDate ? (
          <p className="text-xs text-muted-foreground">
            Follow up {formatDate(row.followUpDate)}
          </p>
        ) : null}
      </EntryCard>
    );
  }

  if (entry.kind === "prescription") {
    const row = data as unknown as {
      id: string;
      code: string;
      status: string;
      diagnosisSummary: string | null;
      doctor: { user: { name: string } };
      items: { id: string; medicineName: string; dosage: string; duration: string }[];
    };

    return (
      <EntryCard
        icon={Pill}
        title={`Prescription ${row.code}`}
        subtitle={row.doctor.user.name}
        date={entry.at}
        status={row.status}
      >
        {row.diagnosisSummary ? (
          <p className="text-sm">{row.diagnosisSummary}</p>
        ) : null}
        <ul className="space-y-0.5 text-sm">
          {row.items.map((item) => (
            <li key={item.id}>
              • {item.medicineName} {item.dosage} — {item.duration}
            </li>
          ))}
        </ul>
      </EntryCard>
    );
  }

  if (entry.kind === "lab-request") {
    const row = data as unknown as {
      id: string;
      code: string;
      status: string;
      priority: string;
      items: { test: { name: string } }[];
    };

    return (
      <EntryCard
        icon={FlaskConical}
        title={`Lab request ${row.code}`}
        subtitle={`${humanize(row.priority)} priority`}
        date={entry.at}
        status={row.status}
      >
        <p className="text-sm">
          {row.items.map((item) => item.test.name).join(", ")}
        </p>
      </EntryCard>
    );
  }

  if (entry.kind === "lab-result") {
    const row = data as unknown as {
      id: string;
      code: string;
      overallStatus: string;
      test: { name: string };
    };

    return (
      <EntryCard
        icon={FlaskConical}
        title={`${row.test.name} — result`}
        subtitle={row.code}
        date={entry.at}
      >
        <AbnormalFlagBadge flag={row.overallStatus} />
      </EntryCard>
    );
  }

  const row = data as unknown as {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: { toString(): string };
    dueAmount: { toString(): string };
    currency: string;
  };

  return (
    <EntryCard
      icon={Receipt}
      title={`Invoice ${row.invoiceNumber}`}
      date={entry.at}
      status={row.status}
    >
      <p className="text-sm tabular-nums">
        Total {formatCurrency(row.totalAmount, row.currency)}
      </p>
    </EntryCard>
  );
}

function EntryCard({
  icon: Icon,
  title,
  subtitle,
  date,
  status,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  subtitle?: string;
  date: Date;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{title}</p>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {status ? <StatusBadge status={status} /> : null}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(date)}
            </span>
          </div>
        </header>

        {children}
      </CardContent>
    </Card>
  );
}