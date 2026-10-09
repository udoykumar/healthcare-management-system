import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { AppError } from "@/lib/api/errors";
import { parseListParams } from "@/lib/api/list-params";
import { listInvoices } from "@/services/billing.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { QueryPagination } from "@/components/shared/query-pagination";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "My invoices" };

/**
 * A patient's own invoices.
 *
 * Every amount shown here is read from the stored invoice row — subtotal, discount,
 * tax, total and due are all written server-side by the billing service and are
 * never recomputed for display (§58).
 */
export default async function PatientInvoicesPage({
  searchParams,
}: PageProps<"/dashboard/patient/invoices">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.INVOICE_READ_OWN);

  if (!user.patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const params = await searchParams;
  const query = await parseListParams(params, {
    sortableColumns: ["createdAt", "issuedAt", "dueAt", "totalAmount"],
    fallbackSort: "createdAt",
    filterKeys: ["status"],
  });

  const page = await listInvoices(user.tenant, query);

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="My invoices"
          description="Bills raised by your healthcare center, and what is still due."
          icon={Receipt}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices"
            description="An invoice appears here after a consultation or test."
          />
        ) : (
          <ul className="space-y-4">
            {page.items.map((invoice) => (
              <li key={invoice.id}>
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="mt-0.5 font-medium">
                          {invoice.doctor
                            ? `Consultation with ${invoice.doctor.name}`
                            : "Center services"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.appointment
                            ? `Appointment ${invoice.appointment.appointmentNumber} · ${formatDate(invoice.appointment.startAt)}`
                            : invoice.issuedAt
                              ? `Issued ${formatDate(invoice.issuedAt)}`
                              : `Created ${formatDate(invoice.createdAt)}`}
                        </p>
                      </div>
                      <StatusBadge status={invoice.status} dot />
                    </header>

                    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Amount label="Subtotal" value={invoice.subtotalAmount} currency={invoice.currency} />
                      {invoice.discountAmount > 0 ? (
                        <Amount
                          label="Discount"
                          value={-invoice.discountAmount}
                          currency={invoice.currency}
                        />
                      ) : null}
                      {invoice.taxAmount > 0 ? (
                        <Amount label="Tax" value={invoice.taxAmount} currency={invoice.currency} />
                      ) : null}
                      <Amount
                        label="Total"
                        value={invoice.totalAmount}
                        currency={invoice.currency}
                        emphasis
                      />
                    </dl>

                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Paid: </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(invoice.paidAmount, invoice.currency)}
                        </span>
                        {invoice.refundedAmount > 0 ? (
                          <span className="ml-2 text-muted-foreground">
                            (refunded{" "}
                            {formatCurrency(invoice.refundedAmount, invoice.currency)})
                          </span>
                        ) : null}
                      </p>

                      <p className="text-sm">
                        <span className="text-muted-foreground">Due: </span>
                        <span
                          className={
                            invoice.dueAmount > 0
                              ? "font-semibold tabular-nums text-destructive"
                              : "font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {formatCurrency(invoice.dueAmount, invoice.currency)}
                        </span>
                        {invoice.dueAt && invoice.dueAmount > 0 ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            due {formatDate(invoice.dueAt)}
                          </span>
                        ) : null}
                      </p>
                    </footer>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <QueryPagination
          pathname="/dashboard/patient/invoices"
          searchParams={params}
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
        />

        <p className="text-xs text-muted-foreground">
          Amounts are calculated by the billing system from the services,
          medicines and tests on each invoice — they are never re-added for
          display. Need a printed copy? Ask at reception.
        </p>
      </PageSection>
    </PageContainer>
  );
}

function Amount({
  label,
  value,
  currency,
  emphasis = false,
}: {
  label: string;
  value: number;
  currency: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 sm:block">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasis
            ? "font-semibold tabular-nums"
            : "text-sm font-medium tabular-nums"
        }
      >
        {formatCurrency(value, currency)}
      </dd>
    </div>
  );
}