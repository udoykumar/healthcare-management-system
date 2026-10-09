import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { RawSearchParams } from "@/lib/api/list-params";

/**
 * Server-rendered pagination for pages that are not tables.
 *
 * `DataTable` has its own client-side controls because it coordinates with
 * TanStack's state. A card list does not, so this is plain `<Link>`s — no client
 * component, no hydration, and every page of a list is a real, shareable URL.
 *
 * All other query keys are preserved, so paging never discards an active search
 * term or filter.
 */
export function QueryPagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total,
  className,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const current = Math.min(Math.max(1, page), totalPages);

  const href = (next: number) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (key === "page") continue;
      const first = Array.isArray(value) ? value[0] : value;
      if (first) params.set(key, first);
    }

    // Page 1 is the canonical URL — no `?page=1` — so the first page of a list has
    // one address rather than two.
    if (next > 1) params.set("page", String(next));

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const hasPrevious = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {current} of {totalPages} · {total} total
      </p>

      <div className="flex items-center gap-2">
        <PageLink
          href={href(current - 1)}
          disabled={!hasPrevious}
          rel="prev"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </PageLink>

        <PageLink href={href(current + 1)} disabled={!hasNext} rel="next">
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  rel,
  children,
}: {
  href: string;
  disabled: boolean;
  rel: "prev" | "next";
  children: React.ReactNode;
}) {
  const className = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    disabled && "pointer-events-none opacity-50",
  );

  /*
   * A disabled control is rendered as a `<span>` rather than a `<Link>`. Keeping an
   * `href` on a link the user cannot follow means a right-click "open in new tab"
   * navigates to a page the control claims is unavailable.
   */
  if (disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} rel={rel} scroll={false} className={className}>
      {children}
    </Link>
  );
}