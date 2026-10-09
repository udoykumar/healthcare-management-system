import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { percentChange } from "@/lib/utils/format";

/**
 * `StatCard` — one metric on a dashboard.
 *
 * The delta is deliberately finicky: `previousValue` of 0 yields `null` rather
 * than "∞%", because a growth percentage against a zero baseline is not a
 * meaningful thing to show a clinic manager.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  previousValue,
  changeLabel = "vs. last period",
  footer,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  /** Enables the trend line. Leave undefined to hide it. */
  previousValue?: number;
  changeLabel?: string;
  footer?: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
  className?: string;
}) {
  const delta =
    typeof previousValue === "number" && typeof value === "number"
      ? percentChange(value, previousValue)
      : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon ? (
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                tone === "positive" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                tone === "negative" && "bg-destructive/10 text-destructive",
                tone === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                tone === "default" && "bg-primary/10 text-primary",
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>

        <div className="flex items-end gap-3">
          <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {delta !== null ? (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-0.5 text-xs font-medium",
                delta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive",
              )}
            >
              {delta >= 0 ? (
                <TrendingUp className="size-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3" aria-hidden="true" />
              )}
              {Math.abs(delta).toFixed(1)}%
              <span className="sr-only">
                {delta >= 0 ? " increase" : " decrease"}
              </span>
            </span>
          ) : null}
        </div>

        {delta !== null ? (
          <p className="-mt-2 text-xs text-muted-foreground">{changeLabel}</p>
        ) : null}
        {hint ? <p className="-mt-2 text-xs text-muted-foreground">{hint}</p> : null}
        {footer}
      </CardContent>
    </Card>
  );
}

/**
 * A labelled figure inside a detail panel — the smaller sibling of StatCard.
 */
export function DataPoint({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}