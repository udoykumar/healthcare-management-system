"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import {
  AXIS_PROPS,
  ChartCard,
  GRID_PROPS,
  chartColor,
} from "./chart-card";

/**
 * Recharts wrappers (§44).
 *
 * Four chart types, one implementation each, rather than a configurable
 * "generic chart" component. The reason is that the differences are not
 * cosmetic: a stacked bar and a donut have different `dataKey`s, different
 * legends and different empty states, and folding them into one component means
 * every call site passes half a dozen `show*` booleans. A dashboard then reads as
 * configuration instead of as a chart.
 *
 * All of these are `"use client"` — Recharts measures the DOM. The data arrives as
 * plain props from a Server Component, so nothing clinical is fetched in the
 * browser.
 */

/**
 * One bar/point/slice.
 *
 * `label` and `value` are required because every chart kind needs them; the index
 * signature allows extra named series (used by `MultiLineChart`) without forcing
 * a second, looser type at each call site.
 */
/**
 * How a chart's axis and tooltip render a value.
 *
 * A *descriptor*, not a formatter callback. These components are Client
 * Components, and a Server Component cannot pass a function across the boundary —
 * doing so fails at render time with "Functions cannot be passed directly to Client
 * Components". Naming the format keeps the decision on the server while the actual
 * `Intl.NumberFormat` construction happens on the client.
 */
export type ValueFormat =
  | { kind: "number" }
  | { kind: "compactNumber" }
  | { kind: "currency"; currency: string }
  | { kind: "compactCurrency"; currency: string };

const numberFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(format: ValueFormat | undefined): (value: number) => string {
  if (!format) return (value) => String(value);

  const options: Intl.NumberFormatOptions =
    format.kind === "number"
      ? { maximumFractionDigits: 0 }
      : format.kind === "compactNumber"
        ? { notation: "compact", maximumFractionDigits: 1 }
        : format.kind === "currency"
          ? { style: "currency", currency: format.currency }
          : { style: "currency", currency: format.currency, notation: "compact", maximumFractionDigits: 1 };

  const cacheKey = JSON.stringify(options);
  const cached = numberFormatters.get(cacheKey);
  if (cached) return (value) => cached.format(value);

  try {
    const formatter = new Intl.NumberFormat("en-US", options);
    numberFormatters.set(cacheKey, formatter);
    return (value) => formatter.format(value);
  } catch {
    // An invalid ISO code in centre settings must not break the chart.
    return (value) => value.toFixed(2);
  }
}

export type ChartDatum = {
  label: string;
  value: number;
  [key: string]: string | number | undefined;
};

/** A point on a line chart: a label plus any named series values. */
export type SeriesDatum = {
  label: string;
  [key: string]: string | number | undefined;
};

/** Trend over time — the default choice for anything that accumulates. */
export function TrendChart({
  title,
  description,
  data,
  valueFormat,
  isEmpty,
  height,
  action,
  className,
}: {
  title: string;
  description?: string;
  data: SeriesDatum[];
  valueFormat?: ValueFormat;
  isEmpty?: boolean;
  height?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const valueFormatter = formatterFor(valueFormat);

  return (
    <ChartCard
      title={title}
      description={description}
      height={height}
      isEmpty={isEmpty}
      action={action}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor(0)} stopOpacity={0.28} />
              <stop offset="100%" stopColor={chartColor(0)} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={44} tickFormatter={valueFormatter} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={<ChartTooltip formatter={valueFormatter} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor(0)}
            strokeWidth={2}
            fill="url(#trend-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Several series over time, e.g. appointments vs. completed. */
export function MultiLineChart({
  title,
  description,
  data,
  valueFormat,
  series,
  isEmpty,
  height,
  className,
}: {
  title: string;
  description?: string;
  data: SeriesDatum[];
  /** Key names present on each datum. */
  series: readonly string[];
  valueFormat?: ValueFormat;
  isEmpty?: boolean;
  height?: string;
  className?: string;
}) {
  const valueFormatter = formatterFor(valueFormat);

  return (
    <ChartCard
      title={title}
      description={description}
      height={height}
      isEmpty={isEmpty}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={44} tickFormatter={valueFormatter} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={<ChartTooltip formatter={valueFormatter} />}
          />
          <Legend
            verticalAlign="bottom"
            height={24}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
          />
          {series.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={chartColor(index)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Ranking / comparison across categories. */
export function CategoryBarChart({
  title,
  description,
  data,
  dataKey = "value",
  isEmpty,
  height,
  className,
  layout = "horizontal",
}: {
  title: string;
  description?: string;
  data: ChartDatum[];
  dataKey?: string;
  isEmpty?: boolean;
  height?: string;
  className?: string;
  /** `horizontal` reads better for ranked names; `vertical` for time buckets. */
  layout?: "horizontal" | "vertical";
}) {
  const horizontal = layout === "horizontal";

  return (
    <ChartCard
      title={title}
      description={description}
      height={height}
      isEmpty={isEmpty}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, bottom: 0, left: horizontal ? 8 : 0 }}
        >
          <CartesianGrid {...GRID_PROPS} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" {...AXIS_PROPS} />
              <YAxis
                type="category"
                dataKey="label"
                {...AXIS_PROPS}
                width={110}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} width={44} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey={dataKey}
            fill={chartColor(0)}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/**
 * Composition of a whole, e.g. appointments by status.
 *
 * `donut` with a centre label because a pie's weakness is reading the total, and
 * putting the total in the middle is what makes it usable at a glance.
 */
export function CompositionChart({
  title,
  description,
  data,
  valueFormat,
  isEmpty,
  height,
  className,
}: {
  title: string;
  description?: string;
  data: ChartDatum[];
  isEmpty?: boolean;
  height?: string;
  className?: string;
  valueFormat?: ValueFormat;
}) {
  const valueFormatter = formatterFor(valueFormat);
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <ChartCard
      title={title}
      description={description}
      height={height}
      isEmpty={isEmpty}
      className={className}
    >
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip formatter={valueFormatter} />} />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="82%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={chartColor(index)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/*
          The centre label is plain DOM over the chart rather than a Recharts
          `Label`, so it stays legible at every size and does not move when the
          legend wraps to two lines on a narrow screen.
        */}
        <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
          <p className="text-xl font-semibold tabular-nums text-foreground">
            {valueFormatter ? valueFormatter(total) : total}
          </p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>
    </ChartCard>
  );
}

/**
 * Tooltip content.
 *
 * Recharts' default tooltip renders an unstyled white box, which is unreadable in
 * dark mode. This one uses the app's tokens.
 */
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number | string }>;
  label?: string | number;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-xs shadow-md">
      {label !== undefined && label !== "" ? (
        <p className="mb-1 font-medium text-foreground">{label}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry, index) => {
          const numeric = Number(entry.value ?? 0);
          return (
            <li
              key={`${entry.name}-${index}`}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: chartColor(index) }}
                aria-hidden="true"
              />
              <span>{entry.name}</span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {formatter ? formatter(numeric) : numeric}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { ChartTooltip, cn };