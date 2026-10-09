import "server-only";

import { z } from "zod";

import { paginationSchema } from "@/lib/api/validate";

/**
 * Query-string parsing for Server Component list pages (§43).
 *
 * `paginationSchema` already exists for route handlers, but those read a `Request`.
 * A page receives Next's `searchParams` promise instead, which is a plain record
 * where a repeated key becomes an array — so it needs a thin adapter rather than
 * being pushed through the request path.
 *
 * The important properties:
 *
 *  - page/size are clamped, so `?pageSize=100000` cannot ask for the whole table
 *  - `sort` is validated against a per-screen allow-list, so an unknown value
 *    degrades to a default instead of reaching Prisma unchecked
 *  - unknown query keys are ignored rather than rejected, so a stale bookmarked
 *    URL still renders
 */

export type RawSearchParams = Record<
  string,
  string | string[] | undefined
> | undefined;

/** First value for a key; a repeated query parameter takes its first value. */
function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Reads the shared list keys out of a page's `searchParams`.
 *
 * `filterKeys` are the extra, screen-specific keys (`status`, `doctorId`, …) that
 * get hoisted onto the result as a plain string map, so a service can consume them
 * without re-parsing the raw object.
 */
export async function parseListParams<Filters extends readonly string[]>(
  searchParams: RawSearchParams,
  options: {
    sortableColumns: readonly string[];
    fallbackSort?: string;
    filterKeys?: Filters;
    defaultOrder?: "asc" | "desc";
  },
): Promise<{
  page: number;
  pageSize: number;
  search: string | undefined;
  sort: string;
  order: "asc" | "desc";
  skip: number;
  take: number;
  orderBy: Record<string, "asc" | "desc">;
  filters: Record<Filters[number], string | undefined>;
}> {
  const raw = Object.fromEntries(
    Object.entries(searchParams ?? {})
      .map(([key, value]) => [key, first(value)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

  const input = await parseWithSchema(raw, options.defaultOrder);

  const sort =
    input.sort && options.sortableColumns.includes(input.sort)
      ? input.sort
      : (options.fallbackSort ?? "createdAt");

  const filters: Record<string, string | undefined> = {};
  for (const key of options.filterKeys ?? []) {
    const value = raw[key];
    filters[key] = value && value.length > 0 ? value : undefined;
  }

  return {
    page: input.page,
    pageSize: input.pageSize,
    search: input.search,
    sort,
    order: input.order,
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: { [sort]: input.order },
    filters,
  };
}

async function parseWithSchema(
  raw: Record<string, string>,
  defaultOrder: "asc" | "desc" | undefined,
) {
  const schema = defaultOrder
    ? paginationSchema.extend({ order: z.enum(["asc", "desc"]).default(defaultOrder) })
    : paginationSchema;

  return schema.parseAsync(raw);
}

/**
 * Resolves a page number back into range.
 *
 * `prisma count` and `findMany` are two queries, so between them the data can
 * change and the last page can be past the end. The page layer clamps rather than
 * rendering an empty table with "page 9 of 3".
 */
export function clampPage(page: number, total: number, pageSize: number): number {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}