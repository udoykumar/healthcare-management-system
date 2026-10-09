"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Card shell for a chart (§44).
 *
 * Recharts needs a measured container with a real height, which is why the body is
 * a fixed `h-*` rather than growing with the data. `ChartFrame` also owns the
 * "no data yet" case: an empty Recharts surface renders an empty box with an axis
 * frame, which reads as broken rather than as "nothing to show yet".
 */

export function ChartCard({
  title,
  description,
  action,
  height = "h-64",
  isEmpty = false,
  emptyMessage = "No data for this period yet.",
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  height?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm font-semibold">{title}</CardTitle>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>

      <CardContent>
        {isEmpty ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground",
              height,
            )}
          >
            {emptyMessage}
          </div>
        ) : (
          <div className={cn("w-full", height)}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Colours for chart series.
 *
 * A single palette, referenced by index, so two charts showing different metrics
 * do not end up with unrelated colours — and so a colour means the same thing on
 * every screen. All of these keep at least 3:1 contrast against the card surface
 * in both light and dark mode.
 */
export const CHART_COLORS = [
  "#0d9488", // teal-600
  "#2563eb", // blue-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#059669", // emerald-600
  "#dc2626", // red-600
  "#475569", // slate-600
] as const;

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0];
}

/**
 * Axis/grid styling shared by every chart.
 *
 * The tick fill is a CSS variable rather than a literal so the axis follows the
 * light/dark theme. Recharts renders SVG, so a hardcoded hex here would be
 * unreadable in dark mode.
 */
export const AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_PROPS = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;