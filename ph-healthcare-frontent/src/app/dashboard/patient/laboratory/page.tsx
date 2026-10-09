import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { AppError } from "@/lib/api/errors";
import { parseListParams } from "@/lib/api/list-params";
import { listLabResults, listLabRequests } from "@/services/laboratory.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge, AbnormalFlagBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryPagination } from "@/components/shared/query-pagination";
import { formatDate, formatRelative, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My lab reports" };

/**
 * A patient's laboratory results.
 *
 * Only results whose request is COMPLETED are returned by the service, so a report
 * cannot appear here while the lab is still entering values into it.
 *
 * Flags are shown exactly as the laboratory recorded them. The system does not
 * interpret a value or tell a patient what it means — that is the treating
 * clinician's job, and re-deriving the flag here would risk contradicting the
 * pathologist (§69).
 */
export default async function PatientLabReportsPage({
  searchParams,
}: PageProps<"/dashboard/patient/laboratory">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.LAB_RESULT_READ_OWN);

  if (!user.patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const params = await searchParams;
  const query = await parseListParams(params, {
    sortableColumns: ["reportedAt"],
    fallbackSort: "reportedAt",
    filterKeys: [],
  });

  /*
   * Two separate queries, two separate sort keys. `LabResult` is dated by
   * `reportedAt` and `LabRequest` by `requestedAt` — sharing one `orderBy` gives
   * Prisma a column the other model does not have.
   */
  const [results, requests] = await Promise.all([
    listLabResults(user.tenant, query),
    listLabRequests(user.tenant, {
      ...query,
      pageSize: 8,
      take: 8,
      sort: "requestedAt",
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="My lab reports"
          description="Results your laboratory has released. Ask your doctor to interpret them."
          icon={FlaskConical}
        />

        {results.items.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No reports yet"
            description="Reports appear here once the laboratory has released them."
          />
        ) : (
          <ul className="space-y-4">
            {results.items.map((report) => (
              <li key={report.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {report.test.name}
                      </CardTitle>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {report.code}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reported {formatDate(report.reportedAt)}
                        {report.verifiedAt
                          ? ` · verified ${formatRelative(report.verifiedAt)}`
                          : ""}
                      </p>
                    </div>
                    <AbnormalFlagBadge flag={report.overallStatus} className="shrink-0" />
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {report.summary ? (
                      <p className="text-sm">{report.summary}</p>
                    ) : null}
                    {report.notes ? (
                      <p className="text-sm text-muted-foreground">
                        {report.notes}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {report.valueCount} parameter
                      {report.valueCount === 1 ? "" : "s"} recorded · ordered by{" "}
                      {report.doctor.name}
                      {report.performedByName ? ` · performed by ${report.performedByName}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <QueryPagination
          pathname="/dashboard/patient/laboratory"
          searchParams={params}
          page={results.page}
          pageSize={results.pageSize}
          total={results.total}
        />

        {requests.items.length > 0 ? (
          <section aria-labelledby="in-progress">
            <h2 id="in-progress" className="mb-2 text-sm font-semibold">
              Tests still in progress
            </h2>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {requests.items.map((request) => (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <StatusBadge status={request.status} dot className="shrink-0" />
                      <span className="truncate">
                        {request.tests.map((test) => test.name).join(", ")}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        requested {formatRelative(request.requestedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Statuses shown: {humanize("REQUESTED")} → {humanize("SAMPLE_COLLECTED")} →{" "}
          {humanize("PROCESSING")} → {humanize("COMPLETED")}.
        </p>
      </PageSection>
    </PageContainer>
  );
}