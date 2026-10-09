import { z } from "zod";

import { AppError } from "@/lib/api/errors";

/**
 * Server-side validation (§29).
 *
 * Client-side Zod is a convenience for the user; this is the boundary. Every
 * route handler and server action parses its input here, so a request that
 * bypasses the browser — curl, a modified client, another device — is still
 * rejected.
 *
 * The distinction that matters: this module validates *shape and type*. Business
 * rules (is this doctor free at 10am? does this patient belong to this centre?)
 * are checked in the service layer against the database, because they need data
 * this layer cannot see.
 */

export type ValidationIssue = {
  path: string;
  message: string;
};

/**
 * Parses and narrows an unknown payload, throwing a 422 with per-field messages on
 * failure. Unknown keys are stripped, which means a caller cannot smuggle in
 * fields like `role` or `healthcareCenterId` that the schema does not mention.
 */
export async function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): Promise<z.output<T>> {
  const result = await schema.safeParseAsync(input);

  if (!result.success) {
    throw AppError.unprocessable(
      "Please correct the highlighted fields and try again.",
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
}

/** Non-throwing variant, for places that want to branch instead of error. */
export async function safeValidate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): Promise<
  | { success: true; data: z.output<T> }
  | { success: false; issues: ValidationIssue[] }
> {
  const result = await schema.safeParseAsync(input);

  if (result.success) return { success: true, data: result.data };

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

/** An id in the database, accepting either a cuid or a UUID. */
export const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid identifier.");

/** A human-facing reference code such as "PT-0001". */
export const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes and underscores only.");

/**
 * Password shape check only. Strength rules live in lib/auth/password.ts so the
 * server and the client share one definition.
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(200, "Password is too long.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(254, "Email is too long.");

/**
 * Optional phone, kept permissive on purpose. E.164 numbering plans vary and the
 * library we would otherwise use rejects legitimate local formats; the loose
 * pattern here plus a character limit is the better trade.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a valid phone number.")
  .max(24, "Phone number is too long.")
  .regex(/^[+()\-\s\d]+$/, "Phone number may only contain digits, spaces and + - ( ).")
  .optional()
  .or(z.literal("").transform(() => undefined));

/** A date-only string ("1990-05-21"), which is what a date input submits. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date.");

export const optionalDateOnlySchema = z
  .union([dateOnlySchema, z.literal("")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

/** Money as a decimal string or number, bounded to the DB's Decimal(12,2). */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const parsed = typeof value === "number" ? value : Number(value.trim());
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount." });
      return z.NEVER;
    }
    if (parsed < 0) {
      ctx.addIssue({ code: "custom", message: "Amount cannot be negative." });
      return z.NEVER;
    }
    if (parsed > 99_999_999_99.99) {
      ctx.addIssue({ code: "custom", message: "Amount is too large." });
      return z.NEVER;
    }
    // Two decimal places, the precision of the column.
    return Math.round(parsed * 100) / 100;
  });

export const percentageSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const parsed = typeof value === "number" ? value : Number(value.trim());
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Percentage must be between 0 and 100.",
      });
      return z.NEVER;
    }
    return Math.round(parsed * 100) / 100;
  });

/** "HH:mm" wall clock, used by the schedule editor. */
export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format.");

/**
 * Turns ?page=&pageSize=&search=&sort=&order= into Prisma arguments.
 *
 * Server-side pagination is mandatory here (§43): `pageSize` is clamped to 200 so
 * a caller cannot ask for the whole table, and `sort` is validated against an
 * allow-list of column names rather than passed through, because an unchecked
 * string in `orderBy` is an injection surface and a foot-gun for typos.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  sort: z.string().trim().max(48).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.output<typeof paginationSchema>;

/**
 * Builds `skip`/`take`/`orderBy` from parsed query params.
 *
 * `sortableColumns` is the allow-list. A requested sort that is not in it falls
 * back to `fallback`, so an unknown `?sort=` degrades to a sensible default
 * instead of erroring or reaching the database unvalidated.
 */
export function buildListArgs(
  input: PaginationInput,
  sortableColumns: readonly string[],
  fallback: string = "createdAt",
) {
  const sort =
    input.sort && sortableColumns.includes(input.sort) ? input.sort : fallback;

  return {
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: { [sort]: input.order },
  } as { skip: number; take: number; orderBy: Record<string, "asc" | "desc"> };
}

/** Parses search params from a request into a validated object. */
export async function parseSearchParams<T extends z.ZodType>(
  schema: T,
  request: Request,
): Promise<z.output<T>> {
  const { searchParams } = new URL(request.url);
  return validate(schema, Object.fromEntries(searchParams.entries()));
}