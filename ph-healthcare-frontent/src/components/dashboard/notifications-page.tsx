import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { NotificationType } from "@/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/authz/session";
import type { AuthorizedUser } from "@/lib/api/errors";
import { parseListParams, type RawSearchParams } from "@/lib/api/list-params";
import { listNotifications } from "@/services/notification.service";

import { PageContainer, PageHeader, PageSection } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServerDataTable, type TableFilterConfig } from "@/components/tables/server-data-table";
import type { DataTableColumn } from "@/components/tables/data-table";
import { formatDateTime, formatRelative, humanize } from "@/lib/utils/format";

/**
 * The notifications screen, shared by all four roles.
 *
 * One implementation rather than four near-identical pages: the data is the same
 * (it is addressed to a login, not to a role), and the only difference between the
 * screens is which dashboard the "back" link points at. Duplicating the columns,
 * the filter config and the empty state four times is how they drift.
 *
 * Authorization still happens per route — each `page.tsx` calls
 * `requireDashboardContext` with its own roles before rendering this, so a patient
 * cannot reach it through the admin URL.
 */
export async function NotificationsPage({
  user,
  searchParams,
  backHref,
}: {
  user: AuthorizedUser;
  searchParams: RawSearchParams;
  backHref: string;
}) {
  // Reads the same notifications as the bell, so a screen shown in the bell must
  // not be denied on the full page.
  requirePermission(user, PERMISSIONS.NOTIFICATION_READ_OWN);

  const query = await parseListParams(searchParams, {
    sortableColumns: ["createdAt", "type"],
    fallbackSort: "createdAt",
    filterKeys: ["type", "unread"],
  });

  const page = await listNotifications(user.id, query);

  const filters: TableFilterConfig[] = [
    {
      key: "type",
      label: "Notification type",
      placeholder: "All types",
      options: Object.values(NotificationType).map((value) => ({
        value,
        label: humanize(value),
      })),
    },
    {
      key: "unread",
      label: "Read status",
      placeholder: "All",
      options: [{ value: "true", label: "Unread only" }],
    },
  ];

  type Row = (typeof page.items)[number];

  const columns: DataTableColumn<Row>[] = [
    {
      id: "title",
      header: "Notification",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.original.title}
            {row.original.readAt ? null : (
              <span className="ml-2 text-xs font-normal text-primary">New</span>
            )}
          </p>
          {row.original.body ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {row.original.body}
            </p>
          ) : null}
        </div>
      ),
      toggleable: false,
    },
    {
      id: "type",
      header: "Type",
      sortKey: "type",
      cell: ({ row }) => (
        <StatusBadge status={row.original.type} label={humanize(row.original.type)} />
      ),
      meta: { nowrap: true },
    },
    {
      id: "read",
      header: "Read",
      cell: ({ row }) =>
        row.original.readAt ? (
          <span className="text-xs text-muted-foreground">
            {formatRelative(row.original.readAt)}
          </span>
        ) : (
          <StatusBadge status="PENDING" label="Unread" />
        ),
      meta: { nowrap: true },
    },
    {
      id: "createdAt",
      header: "Received",
      sortKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
      meta: { nowrap: true },
    },
  ];

  return (
    <PageContainer>
      <PageSection className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Appointment reminders, results, prescriptions and payment notices for your account."
          icon={Bell}
          actions={
            <Button variant="outline" size="sm" render={<Link href={backHref} />}>
              Back to dashboard
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-6">
            {page.total === 0 ? (
              <EmptyState
                icon={CheckCheck}
                title="No notifications"
                description="Reminders and results will appear here as they happen."
              />
            ) : (
              <ServerDataTable<Row>
                columns={columns}
                data={page.items}
                total={page.total}
                sort={query.sort}
                order={query.order}
                getRowId={(row) => row.id}
                caption="Your notifications, newest first"
                searchPlaceholder="Search notifications…"
                searchLabel="Search notifications"
                filters={filters}
                emptyTitle="No notifications match these filters"
                emptyDescription="Clear the filters to see everything."
                toolbarExtra={
                  <p className="text-xs text-muted-foreground">
                    {page.total} total
                  </p>
                }
              />
            )}
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
}