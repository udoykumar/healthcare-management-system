import type { Metadata } from "next";
import { Pill, TriangleAlert } from "lucide-react";

import { RecordStatus, RoleKey } from "@/generated/prisma/enums";
import { requireDashboardContext } from "@/app/dashboard/_lib/dashboard-context";
import { requirePermission } from "@/lib/authz/session";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { parseListParams } from "@/lib/api/list-params";
import { listMedicines, listMedicineCategories } from "@/services/medicine.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatCurrency, formatDate, humanize } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Medicines" };

/**
 * Formulary and stock.
 *
 * On-hand quantity is a sum over `MedicineStock` batches, computed in the service —
 * there is deliberately no `totalStock` column on `Medicine`, because a cached
 * total and the batches that should add up to it would inevitably disagree (§18).
 * Low-stock and expiry are shown per row here and aggregated on the dashboard.
 */
export default async function AdminMedicinesPage({
  searchParams,
}: PageProps<"/dashboard/admin/medicines">) {
  const { user } = await requireDashboardContext([RoleKey.ADMIN]);
  requirePermission(user, PERMISSIONS.MEDICINE_READ);

  const currency = user.healthcareCenterCurrency ?? "USD";

  const query = await parseListParams(await searchParams, {
    sortableColumns: ["name", "unitPrice", "createdAt"],
    fallbackSort: "name",
    defaultOrder: "asc",
    filterKeys: ["status", "category"],
  });

  const [page, categories] = await Promise.all([
    listMedicines(user.tenant, query),
    listMedicineCategories(user.tenant),
  ]);

  const filters: TableFilterConfig[] = [
    {
      key: "status",
      label: "Medicine status",
      options: Object.values(RecordStatus).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "category",
      label: "Category",
      options: categories.map((category) => ({ value: category, label: category })),
    },
  ];

  type Row = (typeof page.items)[number];

  const columns: DataTableColumn<Row>[] = [
    {
      id: "name",
      header: "Medicine",
      sortKey: "name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.code}
            {row.original.genericName ? ` · ${row.original.genericName}` : ""}
          </p>
        </div>
      ),
      toggleable: false,
    },
    {
      id: "form",
      header: "Form & strength",
      cell: ({ row }) => (
        <span className="text-sm">
          {humanize(row.original.dosageForm)}
          {row.original.strength ? ` · ${row.original.strength}` : ""}
        </span>
      ),
      meta: { nowrap: true },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) =>
        row.original.category ? (
          <Badge variant="secondary">{row.original.category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "manufacturer",
      header: "Manufacturer",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {row.original.manufacturer ?? "—"}
        </span>
      ),
    },
    {
      id: "stock",
      header: "On hand",
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 tabular-nums">
          {row.original.stock.onHand}
          {row.original.stock.lowStock ? (
            <StatusBadge status="LOW" label="Low" />
          ) : null}
        </span>
      ),
      meta: { nowrap: true },
    },
    {
      id: "expiry",
      header: "Nearest expiry",
      cell: ({ row }) =>
        row.original.stock.nearestExpiry ? (
          <span className="flex items-center gap-1.5 tabular-nums">
            {formatDate(row.original.stock.nearestExpiry)}
            {row.original.stock.expiringSoon ? (
              <TriangleAlert
                className="size-3.5 text-amber-600 dark:text-amber-400"
                aria-label="Expiring soon"
              />
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      meta: { nowrap: true },
    },
    {
      id: "price",
      header: "Unit price",
      sortKey: "unitPrice",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatCurrency(row.original.unitPrice, currency)}
        </span>
      ),
      meta: { align: "right", nowrap: true },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Medicines"
          description="Formulary, pricing and batch stock for this center."
          icon={Pill}
        />

        <ServerDataTable<Row>
          columns={columns}
          data={page.items}
          total={page.total}
          sort={query.sort}
          order={query.order}
          getRowId={(row) => row.id}
          caption="Medicines in the center formulary"
          searchPlaceholder="Search by name, generic name or brand…"
          searchLabel="Search medicines"
          filters={filters}
          emptyTitle="No medicines found"
          emptyDescription="Add a medicine to start building the formulary."
        />
      </PageSection>
    </PageContainer>
  );
}