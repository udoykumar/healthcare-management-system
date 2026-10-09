import { CalendarDays, Inbox, Stethoscope, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { formatTime } from "@/lib/utils/format";
import type { AppointmentListRow } from "@/services/appointment.service";

/**
 * The agenda strip used on all four dashboards.
 *
 * Deliberately not a `DataTable`: this is a fixed-height list with no
 * pagination, search or column visibility, so the full table machinery would be
 * several hundred kilobytes of interactivity for a widget that renders at most
 * eight rows.
 *
 * It links to the role's own appointment screen rather than a shared one, because
 * each role's appointment list is scoped differently (§36) and a link that lands
 * on an empty or forbidden list is worse than no link.
 */
export function AppointmentAgenda({
  appointments,
  emptyTitle = "No appointments in this window",
  emptyDescription,
  /** Column that reads most naturally for the viewer. */
  emphasise = "patient",
  className,
}: {
  appointments: AppointmentListRow[];
  emptyTitle?: string;
  emptyDescription?: string;
  emphasise?: "patient" | "doctor";
  className?: string;
}) {
  if (appointments.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <EmptyState
            icon={CalendarDays}
            title={emptyTitle}
            description={emptyDescription}
            className="border-0 py-8"
          />
        </CardContent>
      </Card>
    );
  }

  const counterpart = (row: AppointmentListRow) =>
    emphasise === "patient" ? row.patient : row.doctor;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {appointments.map((row) => {
            const person = counterpart(row);

            return (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-16 shrink-0 text-center">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatTime(row.startAt)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {row.appointmentNumber}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    {emphasise === "patient" ? (
                      <Stethoscope className="size-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <UserRound className="size-3 shrink-0" aria-hidden="true" />
                    )}
                    {emphasise === "patient" ? row.doctor.name : row.patient.code}
                    {row.department ? ` · ${row.department.name}` : ""}
                  </p>
                  {row.reason ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {row.reason}
                    </p>
                  ) : null}
                </div>

                <StatusBadge status={row.status} dot className="shrink-0" />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * A compact "recent records" list.
 *
 * Used for recent patients, recent registrations and audit activity, where the
 * useful signal is the row itself rather than any numeric trend.
 */
export function RecentList<T>({
  items,
  getKey,
  renderItem,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  className,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <EmptyState
            icon={Inbox}
            title={emptyTitle}
            description={emptyDescription}
            className="border-0 py-8"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>
      </CardContent>
    </Card>
  );
}

/** A right-aligned figure inside a dashboard row. */
export function Figure({
  value,
  caption,
  tone = "default",
}: {
  value: React.ReactNode;
  caption?: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <div className="text-right">
      <p
        className={cn(
          "text-sm font-medium tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="text-[11px] text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}
