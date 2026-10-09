import type { Metadata } from "next";
import { Pill } from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { AppError } from "@/lib/api/errors";
import { parseListParams } from "@/lib/api/list-params";
import { listPrescriptions } from "@/services/prescription.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, humanize } from "@/lib/utils/format";
import { QueryPagination } from "@/components/shared/query-pagination";

export const metadata: Metadata = { title: "My prescriptions" };

/**
 * Prescriptions a patient has been issued.
 *
 * Rendered as cards rather than a table: a prescription is a short list of
 * medicines with dosage, frequency and duration, which does not survive being
 * flattened into table columns a patient has to reassemble mentally. A printable
 * PDF route belongs on each card (§46) and is the obvious place for it to hang.
 *
 * Read-only. A patient cannot edit or cancel a prescription here, and the server
 * refuses such a request regardless of what the browser sends (§6).
 */
export default async function PatientPrescriptionsPage({
  searchParams,
}: PageProps<"/dashboard/patient/prescriptions">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.PRESCRIPTION_READ_OWN);

  if (!user.patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const params = await searchParams;

  const query = await parseListParams(params, {
    sortableColumns: ["prescribedAt", "status", "followUpDate"],
    fallbackSort: "prescribedAt",
    filterKeys: ["status"],
  });

  const page = await listPrescriptions(user.tenant, query);

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="My prescriptions"
          description="Everything your doctor has prescribed, most recent first."
          icon={Pill}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No prescriptions yet"
            description="Prescriptions issued after a consultation appear here."
          />
        ) : (
          <ul className="space-y-4">
            {page.items.map((prescription) => (
              <li key={prescription.id}>
                <Card>
                  <CardContent className="space-y-4 p-5">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">
                          {prescription.code}
                        </p>
                        <p className="mt-0.5 font-semibold">
                          {prescription.doctor.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prescription.visitDate
                            ? `Consultation ${formatDate(prescription.visitDate)}`
                            : `Prescribed ${formatDate(prescription.prescribedAt)}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={prescription.status} dot />
                        {prescription.followUpDate ? (
                          <span className="text-xs text-muted-foreground">
                            Follow up {formatDate(prescription.followUpDate)}
                          </span>
                        ) : null}
                      </div>
                    </header>

                    {prescription.diagnosisSummary ? (
                      <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                        <span className="font-medium">Diagnosis: </span>
                        {prescription.diagnosisSummary}
                      </p>
                    ) : null}

                    {/*
                      A real table rather than a list: dosage, frequency, duration
                      and route are four short values the patient has to read as a
                      row to take the medicine correctly.
                    */}
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <caption className="sr-only">
                          Medicines on prescription {prescription.code}
                        </caption>
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-medium">
                              Medicine
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                              Dosage
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                              Frequency
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                              Duration
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                              Route
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {prescription.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 font-medium">
                                {item.medicineName}
                                {item.instructions ? (
                                  <span className="block text-xs font-normal text-muted-foreground">
                                    {item.instructions}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {item.dosage}
                              </td>
                              <td className="px-3 py-2">
                                {item.frequencyText ?? humanize(item.frequency)}
                              </td>
                              <td className="px-3 py-2 tabular-nums">
                                {item.duration}
                              </td>
                              <td className="px-3 py-2">{humanize(item.route)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {prescription.instructions ? (
                      <p className="text-sm">
                        <span className="font-medium">Instructions: </span>
                        {prescription.instructions}
                      </p>
                    ) : null}

                    {prescription.generalAdvice ? (
                      <p className="text-sm">
                        <span className="font-medium">Advice: </span>
                        {prescription.generalAdvice}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <QueryPagination
          pathname="/dashboard/patient/prescriptions"
          searchParams={params}
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
        />
      </PageSection>
    </PageContainer>
  );
}