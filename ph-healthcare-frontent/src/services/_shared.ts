import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Shared plumbing for the service layer.
 *
 * Services are the only place Prisma is called from the application. Pages and
 * Server Components ask a service for exactly the rows they render; they never
 * build a `where` clause themselves. Two reasons this boundary is worth the
 * indirection:
 *
 *  1. Tenant scoping. Every service builds its filter through `scopeToCenter`, so
 *     "which center's data am I allowed to see" is decided once per call rather
 *     than remembered at forty call sites.
 *  2. Serialization. `Decimal` columns and `Json` metadata do not belong in a
 *     React prop. Converting at the service boundary means no component has to
 *     know Prisma's runtime shapes.
 */

/** The validated, sorted, paged query a list service receives. */
export type ListQuery = {
  page: number;
  pageSize: number;
  search: string | undefined;
  sort: string;
  order: "asc" | "desc";
  skip: number;
  take: number;
  orderBy: Record<string, "asc" | "desc">;
  filters: Record<string, string | undefined>;
};

/** A page of rows plus the count the table footer needs. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** A point on a dashboard chart. `label` is what the axis shows. */
export type SeriesPoint = {
  label: string;
  value: number;
};

export type Series = {
  name: string;
  points: SeriesPoint[];
};

/**
 * Appointment statuses from which no consultation will follow.
 *
 * Used wherever "upcoming" is meant — a cancelled appointment must not appear in
 * a doctor's "next up" list or be counted as demand.
 */
export const APPOINTMENT_TERMINAL_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

/** The subset that also removes the slot from the calendar. */
export const CANCELED_STATUSES = ["CANCELLED", "NO_SHOW"] as const;

/**
 * Decimal (Prisma) → number.
 *
 * Money is stored as `Decimal(12,2)` precisely so no float rounding error can
 * reach the ledger. Converting to `number` is safe *for display and charting*; the
 * authoritative arithmetic stays in Decimal inside the billing service.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Optional Decimal → number, preserving "no value" as null. */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(numeric) ? numeric : null;
}

/** Trims a search term and collapses it to undefined when empty. */
export function normalizeSearch(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** A single case-insensitive "contains" predicate for one text column. */
export type SearchMatch = { contains: string; mode: "insensitive" };

type ModelKey = Prisma.TypeMap["meta"]["modelProps"];

/**
 * The generated `where` input for a model, derived rather than restated.
 *
 * Naming the model (`searchOr<"appointment">`) makes the returned clause type-check
 * against that model's real `WhereInput`. Without the model parameter the clause
 * has to be returned as a loose record, and a loose record silently fails to
 * assign to a Prisma `where` — which turns a type error into a runtime
 * "Unknown argument" from the database instead.
 */
type WhereOf<M extends ModelKey> = NonNullable<
  Extract<
    Prisma.TypeMap["model"][Capitalize<M>]["operations"]["findMany"]["args"],
    { where?: unknown }
  >["where"]
>;

/**
 * Case-insensitive "contains" across several columns, OR-ed together.
 *
 * Fields may be dot-qualified (`"user.name"`), which builds a nested relation
 * filter. Prisma 7 rejects a literal dotted key as an unknown argument, and
 * spreading two separate `OR` clauses would silently drop one of them, so the
 * nesting is done here once rather than at each call site.
 *
 * `fields` is always a literal array in the calling service, never derived from
 * user input, so this cannot be used to reach an unintended relation.
 *
 * The return type keeps `mode` as the literal `"insensitive"` rather than widening
 * it to `string` — a widened `mode` is not assignable to Prisma's `StringFilter`,
 * which turns every list query into a type error.
 */
export function searchOr<M extends ModelKey>(
  search: string | undefined,
  fields: readonly string[],
): { OR: WhereOf<M>[] } | undefined {
  const term = normalizeSearch(search);
  if (!term) return undefined;

  const match: SearchMatch = { contains: term, mode: "insensitive" };
  const clauses = fields.map((field) => nest(field.split("."), match));

  // Safe because every segment in `fields` is a literal in the calling service, so
  // the nesting can only produce relation filters that model actually declares.
  return { OR: clauses as unknown as WhereOf<M>[] };
}

type SearchClause = SearchMatch | { [relation: string]: SearchClause };

function nest(segments: string[], match: SearchMatch): SearchClause {
  const [head, ...rest] = segments;
  if (!head || rest.length === 0) return match;
  return { [head]: nest(rest, match) };
}

/**
 * Turns a query-string value into an enum member, or undefined.
 *
 * Anything not in `source` is dropped rather than passed through: an unvalidated
 * enum value would reach Prisma as an unexpected string and surface as a 500.
 */
export function asEnumValue<T extends Record<string, string>>(
  source: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) return undefined;
  const allowed = Object.values(source) as string[];
  return allowed.includes(value) ? (value as T[keyof T]) : undefined;
}

/** Today at 00:00:00.000 UTC. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Today at 23:59:59.999 UTC. */
export function endOfToday(): Date {
  return new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) - 1);
}

type MonthWindow = {
  start: Date;
  end: Date;
  keys: string[];
  labels: string[];
};

/**
 * A trailing month window, oldest first.
 *
 * Chart axes read left-to-right, so the buckets come back in chronological order
 * even though the window is described backwards ("last 6 months").
 */
export function monthWindow(count: number, reference = new Date()): MonthWindow {
  const keys: string[] = [];
  const labels: string[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset, 1),
    );
    keys.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    labels.push(
      date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    );
  }

  return {
    start: new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - (count - 1), 1),
    ),
    end: endOfMonth(reference),
    keys,
    labels,
  };
}

/**
 * Buckets rows into a month series.
 *
 * `dateOf` and `valueOf` are passed explicitly rather than assumed, because the
 * rows a service holds do not all carry a `createdAt` — a lab result is dated by
 * `reportedAt`, an invoice by `issuedAt`.
 *
 * Rows outside the window are dropped rather than folded into the nearest bucket,
 * which is what a naive "sum everything into N buckets" implementation does when
 * the query returns more than it thought.
 */
export function toMonthlySeries<T>(
  rows: readonly T[],
  months: number,
  dateOf: (row: T) => Date | null | undefined,
  valueOf: (row: T) => number,
  name: string,
): Series {
  const { keys, labels } = monthWindow(months);
  const totals = new Map<string, number>(keys.map((key) => [key, 0]));

  for (const row of rows) {
    const date = dateOf(row);
    if (!date) continue;

    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = totals.get(key);
    if (bucket === undefined) continue;

    totals.set(key, bucket + valueOf(row));
  }

  return {
    name,
    points: keys.map((key, index) => ({
      label: labels[index] ?? key,
      value: totals.get(key) ?? 0,
    })),
  };
}

/**
 * Fills a series with zero buckets for keys with no rows.
 *
 * Without this a month with no activity would be absent from the chart entirely
 * and the x-axis would silently skip it, which reads as "we stopped measuring".
 */
export function emptySeries(months: number, name: string): Series {
  const { labels } = monthWindow(months);
  return {
    name,
    points: labels.map((label) => ({ label, value: 0 })),
  };
}