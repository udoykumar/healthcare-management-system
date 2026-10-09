import type { Metadata } from "next";
import { Banknote } from "lucide-react";

import { PaymentMethod, PaymentStatus, RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { AppError } from "@/lib/api/errors";
import { parseListParams } from "@/lib/api/list-params";
import { listPayments } from "@/services/billing.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatCurrency, formatDateTime, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Payment history" };

/**
 * A patient's payment receipts.
 *
 * A refund is a new row rather than an edit on the original payment, so this table
 * shows `refundedAmount` beside `amount` instead of netting them — the receipt as
 * it was issued stays readable (§22).
 */
export default async function PatientPaymentsPage({
  searchParams,
}: PageProps<"/dashboard/patient/payments">) {
  const { user } = await requireDashboardContext([RoleKey.PATIENT]);
  requirePermission(user, PERMISSIONS.PAYMENT_READ_OWN);

  if (!user.patientId) {
    throw AppError.forbidden(
      "This account is not linked to a patient record. Contact your healthcare center.",
      "NO_PATIENT_PROFILE",
    );
  }

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["createdAt", "paidAt", "amount"],
    fallbackSort: "createdAt",
    filterKeys: ["status", "method"],
  });

  const page = await listPayments(user.tenant, query);

  const filters: TableFilterConfig[] = [
    {
      key: "status",
      label: "Payment status",
      options: Object.values(PaymentStatus).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "method",
      label: "Payment method",
      options: Object.values(PaymentMethod).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
  ];

  type Row = (typeof page.items)[number];

  const columns: DataTableColumn<Row>[] = [
    {
      id: "paymentNumber",
      header: "Receipt",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.paymentNumber}
        </span>
      ),
      meta: { nowrap: true },
      toggleable: false,
    },
    {
      id: "invoice",
      header: "Invoice",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">
            {row.original.invoice.invoiceNumber}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Invoice due {formatCurrency(row.original.invoice.dueAmount, row.original.currency)}
          </p>
        </div>
      ),
      toggleable: false,
    },
    {
      id: "amount",
      header: "Amount",
      sortKey: "amount",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(row.original.amount, row.original.currency)}
        </span>
      ),
      meta: { align: "right", nowrap: true },
    },
    {
      id: "refunded",
      header: "Refunded",
      cell: ({ row }) =>
        row.original.refundedAmount > 0 ? (
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(row.original.refundedAmount, row.original.currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      meta: { align: "right", nowrap: true },
    },
    {
      id: "method",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-sm">
          {humanize(row.original.method)}
          {row.original.cardLast4 ? ` ••••${row.original.cardLast4}` : ""}
          {row.original.bankName ? ` · ${row.original.bankName}` : ""}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      meta: { nowrap: true },
    },
    {
      id: "paidAt",
      header: "Paid",
      sortKey: "paidAt",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.paidAt
            ? formatDateTime(row.original.paidAt)
            : "Not completed"}
        </span>
      ),
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Payment history"
          description="Every payment recorded against your invoices."
          icon={Banknote}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Your payments, newest first"
          searchPlaceholder="Search by receipt or transaction id…"
          searchLabel="Search payments"
          filters={filters}
          emptyTitle="No payments yet"
          emptyDescription="Payments appear here once an invoice is settled."
        />

        <p className="text-xs text-muted-foreground">
          Only the last four digits of a card are stored; full card numbers are
          never held.
        </p>
      </PageSection>
    </PageContainer>
  );
}