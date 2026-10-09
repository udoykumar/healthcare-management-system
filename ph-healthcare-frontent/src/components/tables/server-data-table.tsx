"use client";

import type { LucideIcon } from "lucide-react";

import {
  FilterSelect,
  SearchInput,
  useListState,
} from "@/hooks/use-list-state";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";

/**
 * A `DataTable` bound to the URL query string (§27, §28, §43).
 *
 * The split of responsibilities:
 *
 *  - the page (Server Component) reads `searchParams`, queries the database and
 *    passes the resulting rows plus the total down as props;
 *  - this component (Client Component) owns the *controls* — search box, filter
 *    dropdowns, pagination buttons, sort headers — and expresses every change as
 *    a query-string update.
 *
 * The rows are therefore never fetched from the client, and the set shown is
 * exactly the set the server query authorized, while the controls still feel
 * instant: navigation is optimistic and `useListState` debounces the search term.
 */

export type TableFilterConfig = {
  /** Query-string key, e.g. "status". */
  key: string;
  /** Accessible label for the dropdown. */
  label: string;
  /** Text shown when nothing is selected. */
  placeholder?: string;
  options: readonly { value: string; label: string }[];
};

export type ServerDataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;

  /** Row count for the whole filtered result, from the server's `count`. */
  total: number;

  /** Search box. Omit to hide it. */
  searchPlaceholder?: string;
  searchLabel?: string;

  /** Filter dropdowns, written into the URL as `key=value`. */
  filters?: readonly TableFilterConfig[];

  /** Extra controls rendered to the right of the filters. */
  toolbarExtra?: React.ReactNode;

  /**
   * Enables server-side sorting. `sort` is the column key; leave undefined for a
   * screen with no sortable columns, and the headers render as plain text.
   */
  sort?: string;
  order?: "asc" | "desc";

  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;

  caption?: string;
  className?: string;
};

export function ServerDataTable<T>({
  columns,
  data,
  getRowId,
  total,
  searchPlaceholder,
  searchLabel = "Search",
  filters = [],
  toolbarExtra,
  sort,
  order = "desc",
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  caption,
  className,
}: ServerDataTableProps<T>) {
  const list = useListState();

  const toolbar =
    searchPlaceholder || filters.length > 0 || toolbarExtra ? (
      <div className="flex w-full flex-wrap items-center gap-2">
        {searchPlaceholder ? (
          <SearchInput
            value={list.searchTerm}
            onChange={list.setSearchTerm}
            placeholder={searchPlaceholder}
            label={searchLabel}
            className="w-full sm:w-64"
          />
        ) : null}

        {filters.map((filter) => (
          <FilterSelect
            key={filter.key}
            label={filter.label}
            placeholder={filter.placeholder ?? "All"}
            options={[...filter.options]}
            value={list.getParam(filter.key)}
            onChange={(value) => list.setFilter(filter.key, value)}
          />
        ))}

        {toolbarExtra ? <div className="ml-auto">{toolbarExtra}</div> : null}
      </div>
    ) : undefined;

  return (
    <DataTable<T>
      columns={columns}
      data={data}
      getRowId={getRowId}
      caption={caption}
      className={className}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyIcon={emptyIcon}
      emptyAction={emptyAction}
      toolbar={toolbar}
      pagination={{
        page: list.page,
        pageSize: list.pageSize,
        total,
        onPageChange: list.setPage,
        onPageSizeChange: list.setPageSize,
      }}
      sorting={
        sort === undefined
          ? undefined
          : {
              sort,
              order,
              onSortChange: (nextSort, nextOrder) =>
                list.setSort(nextSort, nextOrder),
            }
      }
    />
  );
}