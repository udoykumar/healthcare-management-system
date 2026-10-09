import { formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Display formatters.
 *
 * Server-safe: no React, no browser APIs.
 *
 * Every timestamp in the database is stored in UTC (see docs/architecture.md), and
 * every user-visible time is rendered in the *healthcare center's* timezone rather
 * than the server's or the browser's. That distinction matters for a scheduling
 * system: a 10:00 appointment in Asia/Dhaka is stored as 04:00Z, and formatting
 * that with the default `date-fns` helpers would show 04:00 to a patient in Dhaka
 * and a different number again to an admin in London.
 *
 * The `timeZone` parameter therefore matters and is not optional decoration — pass
 * the centre's IANA zone, which reaches the client through the session
 * (`user.healthcareCenterTimezone`).
 */

const DEFAULT_TZ = "UTC";

/** "12 Mar 2026" */
export function formatDate(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "—";
  return formatInTimeZone(value as Date | string, timeZone, "dd MMM yyyy");
}

/** "12 Mar 2026, 14:30" */
export function formatDateTime(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "—";
  return formatInTimeZone(value as Date | string, timeZone, "dd MMM yyyy, HH:mm");
}

/** "14:30" */
export function formatTime(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "—";
  return formatInTimeZone(value as Date | string, timeZone, "HH:mm");
}

/** "12 Mar 2026, 2:30 PM" */
export function formatDateTimeLong(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "—";
  return formatInTimeZone(value as Date | string, timeZone, "dd MMM yyyy, h:mm a");
}

/** "12 Mar 2026, 2:30 PM Asia/Dhaka" — for email and printed documents. */
export function formatDateTimeZoned(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "—";
  return formatInTimeZone(
    value as Date | string,
    timeZone,
    "dd MMM yyyy, h:mm a zzz",
  );
}

/**
 * "in 3 hours" / "2 days ago".
 *
 * Relative to the browser's clock on the client and the server's on the server, so
 * this is only for "when did this happen" copy. Never for an appointment time.
 */
export function formatRelative(
  value: Date | string | null | undefined,
): string {
  const date = toDate(value);
  if (!date) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** For <input type="date">, which requires exactly YYYY-MM-DD. */
export function toDateInputValue(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "";
  return formatInTimeZone(value as Date | string, timeZone, "yyyy-MM-dd");
}

/**
 * For <input type="datetime-local">, which has no timezone.
 *
 * The value must be expressed in the *centre's* zone, because that is the wall
 * clock the user is looking at in the form. Reading it back has to apply the same
 * zone — see `fromDateTimeInput`, which is the inverse.
 */
export function toDateTimeInputValue(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TZ,
): string {
  if (!toDate(value)) return "";
  return formatInTimeZone(value as Date | string, timeZone, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Interprets a `datetime-local` value as wall-clock time *in the given zone* and
 * returns the corresponding UTC instant.
 *
 * `new Date("2026-03-12T10:00")` would parse that as the *server's* local time,
 * which silently books appointments in the wrong hour whenever the server is not in
 * the clinic's timezone.
 */
export function fromDateTimeInput(
  value: string,
  timeZone = DEFAULT_TZ,
): Date {
  // `z` marks the offset as "the zone I am about to supply", which makes
  // fromZonedTime treat the input as wall-clock time in that zone.
  return new Date(`${value}${offsetSuffix(timeZone, value)}`);
}

/** Like `fromDateTimeInput` for a date-only value. */
export function fromDateInput(value: string, timeZone = DEFAULT_TZ): Date {
  return fromDateTimeInput(`${value}T00:00`, timeZone);
}

function offsetSuffix(timeZone: string, isoLocal: string): string {
  // The offset for the *specific* instant, so a date either side of a DST
  // boundary still resolves correctly.
  const guess = new Date(`${isoLocal}Z`);
  if (Number.isNaN(guess.getTime())) return "Z";
  return toOffsetString(formatInTimeZone(guess, timeZone, "XXX"));
}

function toOffsetString(xxx: string): string {
  // "Z", "+06:00" or "-04:00"
  return xxx === "Z" ? "Z" : xxx;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

// ─── Age ──────────────────────────────────────────────────────────────────────

/**
 * Age in whole years, in UTC.
 *
 * Subtracts a year when the birthday has not yet occurred this calendar year, so
 * someone born on 29 February is not off by one on non-leap years.
 */
export function calculateAge(
  dateOfBirth: Date | string | null | undefined,
  today: Date = new Date(),
): number | null {
  const birth = toDate(dateOfBirth);
  if (!birth) return null;

  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }

  return age < 0 ? null : age;
}

// ─── Money ────────────────────────────────────────────────────────────────────

/**
 * Money.
 *
 * Accepts `number | string | Decimal | null` because Prisma returns Decimal
 * columns as Decimal.js instances, which will not coerce to number implicitly.
 * The amount itself is never re-derived here — totals are computed server-side by
 * the billing service.
 */
export function formatCurrency(
  amount: number | string | { toString(): string } | null | undefined,
  currency = "USD",
  locale = "en-US",
): string {
  const numeric = toAmount(amount);
  if (numeric === null) return "—";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    // An invalid ISO code in the centre settings must not crash a whole page.
    return `${numeric.toFixed(2)} ${currency}`;
  }
}

/** Compact money for dashboard tiles: "$1.2K", "$3.4M". */
export function formatCurrencyCompact(
  amount: number | string | { toString(): string } | null | undefined,
  currency = "USD",
  locale = "en-US",
): string {
  const numeric = toAmount(amount);
  if (numeric === null) return "—";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
}

function toAmount(
  amount: number | string | { toString(): string } | null | undefined,
): number | null {
  if (amount === null || amount === undefined || amount === "") return null;

  // Decimal.js instances (what Prisma returns for Decimal columns) are objects,
  // so this branch is the common case for money read straight from the database.
  const numeric = typeof amount === "object" ? Number(amount.toString()) : amount;

  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
}

/**
 * Money as a plain two-decimal string, for a form field or a request body.
 * Keeps trailing zeros, which matters for an invoice line.
 */
export function moneyToInput(
  amount: number | string | { toString(): string } | null | undefined,
): string {
  const numeric = toAmount(amount);
  return numeric === null ? "0.00" : numeric.toFixed(2);
}

/** Percentage for display: 12.5 → "12.5%". */
export function formatPercent(
  value: number | string | { toString(): string } | null | undefined,
): string {
  const numeric = toAmount(value);
  return numeric === null ? "—" : `${numeric.toFixed(1)}%`;
}

// ─── Text ─────────────────────────────────────────────────────────────────────

/** "SUPERADMIN" → "Superadmin", "IN_PERSON" → "In person". */
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase().trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** "Ada Lovelace" → "Ada L." — used in dense tables. */
export function truncateName(name: string, max = 24): string {
  if (name.length <= max) return name;
  const parts = name.split(" ");
  return parts.length > 1
    ? `${parts[0]} ${parts[1]![0]}.`
    : `${name.slice(0, max - 1)}…`;
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** Bytes → "1.4 MB". Used by the document list. */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Percentage change for dashboard deltas; null when there is no baseline. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}