"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * List-view state bound to the URL query string (§43, §28).
 *
 * Search, page, sort and filters live in the URL rather than component state, for
 * three reasons: a filtered view becomes a shareable link, the browser's back
 * button steps through filter changes, and a server component can read the same
 * params to build its query. This is the hook that keeps those in sync.
 *
 * `useDeferredValue` on the search term keeps typing responsive: the URL updates
 * on the deferred value, so a slow query does not block keystrokes.
 */

const DEBOUNCE_MS = 350;

export type ListFilters = Record<string, string | undefined>;

export function useListState(options?: { defaultPageSize?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize =
    Number(searchParams.get("pageSize") ?? String(options?.defaultPageSize ?? 20)) || 20;
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") || undefined;
  const order = (searchParams.get("order") as "asc" | "desc") ?? "desc";

  const [searchTerm, setSearchTerm] = useState(search);
  const lastPushedSearch = useRef(search);

  // Keep the input in step when the URL changes from elsewhere (back button, a
  // reset link, clicking through from a dashboard).
  useEffect(() => {
    if (search !== lastPushedSearch.current) {
      lastPushedSearch.current = search;
      setSearchTerm(search);
    }
  }, [search]);

  const applyParams = useCallback(
    (updates: ListFilters, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }

      // Any change to a filter or the sort invalidates the current page number:
      // staying on page 7 of a result set that now has 2 pages shows nothing.
      if (options?.resetPage !== false) next.delete("page");

      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  /** Current value of an arbitrary query key. */
  const getParam = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  // Debounced search push.
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed === search) return;

    const timer = setTimeout(() => {
      lastPushedSearch.current = trimmed;
      applyParams({ search: trimmed || undefined });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm, search, applyParams]);

  return {
    page,
    pageSize,
    search,
    searchTerm,
    setSearchTerm,
    sort,
    order,
    isPending,

    /** Reads any query key. Used by filter controls that are not part of this hook. */
    getParam,

    setPage: (next: number) => applyParams({ page: String(next) }, { resetPage: false }),
    setPageSize: (next: number) =>
      applyParams({ pageSize: String(next) }, { resetPage: false }),
    setFilter: (key: string, value: string | undefined) =>
      applyParams({ [key]: value }),
    /**
     * Sets sort and order in a single navigation. Toggling through
     * `setFilter` twice would push two history entries and, worse, briefly render
     * the new column with the previous direction.
     */
    setSort: (nextSort: string | undefined, nextOrder: "asc" | "desc" = order) =>
      applyParams({ sort: nextSort, order: nextSort ? nextOrder : undefined }),
    /** Cycles a column: unset → asc → desc → unset. */
    toggleSort: (nextSort: string) =>
      applyParams({
        sort: sort === nextSort && order === "desc" ? undefined : nextSort,
        order: sort === nextSort && order === "asc" ? "desc" : "asc",
      }),
    reset: () =>
      applyParams({
        page: undefined,
        search: undefined,
        sort: undefined,
        order: undefined,
      }),
  };
}

export type ListState = ReturnType<typeof useListState>;

/**
 * Debounced search field (§27).
 *
 * Includes a clear button, because a user who has typed a long query needs to
 * empty it in one action rather than select-all and delete.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  label = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pr-8 pl-8"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** A select that writes straight into the URL query. */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "All",
  label,
  className,
  widthClassName = "w-[180px]",
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  label: string;
  className?: string;
  widthClassName?: string;
}) {
  return (
    <Select
      value={value ?? "__all__"}
      onValueChange={(next) => onChange(!next || next === "__all__" ? undefined : next)}
    >
      <SelectTrigger className={cn(widthClassName, className)} aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Resets filters and search in one action. */
export function ClearFiltersButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className={className}>
      Clear
    </Button>
  );
}