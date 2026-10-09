import type { ComponentProps } from "react";
import { format, parseISO } from "date-fns";

/**
 * Date/time helpers built on date-fns.
 *
 * The recurring-rota types (`"09:00"`) are wall-clock strings in the centre's
 * timezone and are handled here rather than with Date, because a `Date` would
 * silently reinterpret them in the server's zone. `minutesFromHHmm` and
 * `hhmmFromMinutes` are the only conversions between the two representations,
 * and both are pure string math — no Date involved, so no timezone can leak in.
 */

/** "09:30" → 570. Returns null for anything unparseable. */
export function minutesFromHHmm(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 570 → "09:30". Clamped to a valid day rather than rolling over. */
export function hhmmFromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** True when two half-open ranges [aStart,aEnd) and [bStart,bEnd) overlap. */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Human label for a rota block, e.g. "09:00 – 13:00". */
export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type DayOfWeekKey = (typeof DAY_ORDER)[number];

export const DAY_LABELS: Record<DayOfWeekKey, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const DAY_SHORT: Record<DayOfWeekKey, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

/** ISO day of week (0 = Sunday) → our enum key. */
export function isoDayToKey(day: number): DayOfWeekKey {
  return DAY_ORDER[(day + 6) % 7] as DayOfWeekKey;
}

export function keyToIsoDay(key: DayOfWeekKey): number {
  const index = DAY_ORDER.indexOf(key);
  return index === 6 ? 0 : index + 1;
}

/** Midnight UTC on the given date, used to bound a day's queries. */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/** "YYYY-MM-DD" → a UTC Date at midnight, for date-only columns. */
export function dateFromInput(value: string): Date {
  return parseISO(`${value}T00:00:00.000Z`);
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** The current month as a UTC range, for dashboard comparisons. */
export function monthRange(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  return {
    start: new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1)),
    end: new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    ),
  };
}

export function daysAgo(count: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - count * 24 * 60 * 60 * 1000);
}

/** Renders a `<time>` element's attributes. */
export function timeProps(value: Date | string) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return { dateTime: date.toISOString() } satisfies ComponentProps<"time">;
}