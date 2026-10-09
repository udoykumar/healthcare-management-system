"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type Updater,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  type LucideIcon,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";

/**
 * The reusable data table (§28).
 *
 * Deliberately *presentational*: it takes rows and columns and owns nothing about
 * the server. That matters because the alternative — one table per feature — is
 * where sorting, pagination and empty-state handling quietly diverge. Data
 * loading and server-side query construction live in `useDataTable`, which keeps
 * this component usable from a Server Component that already has the rows.
 *
 * Server-side sorting is the default (`manualSorting`), because a clinic's
 * patient table will eventually outgrow any client-side sort.
 */

export type DataTableColumn<T> = ColumnDef<T, unknown> & {
  /** Hidden by default; the user can enable it from the column menu. */
  toggleable?: boolean;
  /** Lets the header switch to this column when its label is clicked. */
  sortKey?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Row identity for React keys and selection. */
  getRowId: (row: T) => string;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;

  /** Server-driven pagination. Omit for client-side paging of a small set. */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };

  /** Server-driven sorting. */
  sorting?: {
    sort: string | undefined;
    order: "asc" | "desc";
    onSortChange: (sort: string | undefined, order: "asc" | "desc") => void;
  };

  onRowClick?: (row: T) => void;
  /** Rendered on the right of the toolbar. */
  toolbar?: React.ReactNode;
  /** Always-visible client-side filter applied to rows. */
  globalFilter?: string;

  className?: string;
  /** Column the header should use for the accessibility label of the sort control. */
  caption?: string;
};

export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription,
  emptyIcon,
  emptyAction,
  pagination,
  sorting,
  onRowClick,
  toolbar,
  globalFilter,
  className,
  caption,
}: DataTableProps<T>) {
  const [sorting_, setSorting_] = useState<SortingState>([]);
  // Only the value is needed: visibility is toggled through
  // `column.toggleVisibility` from the column menu, which writes this same state.
  const [columnVisibility] = useState<VisibilityState>({});
  const [globalFilter_, setGlobalFilter_] = useState(globalFilter ?? "");

  const manualSorting = Boolean(sorting);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting: sorting_,
      columnVisibility,
      globalFilter: globalFilter_,
      ...(manualSorting ? {} : { sorting: sorting_ }),
    },
    // Server-side sorting: never let TanStack reorder rows locally, because the
    // rows on screen are page N and sorting them would produce a globally wrong
    // order.
    manualSorting,
    manualPagination: Boolean(pagination),
    onSortingChange: manualSorting
      ? undefined
      : (updater: Updater<SortingState>) => {
          setSorting_((previous) =>
            typeof updater === "function" ? updater(previous) : updater,
          );
        },
    onGlobalFilterChange: setGlobalFilter_,
    getCoreRowModel: getCoreRowModel(),
    ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: false,
  });

  /*
   * The header row, filtered to columns the user has not hidden.
   *
   * Note the v8 shape: `getContext()` belongs to Header, not Column, and the
   * custom bits (`sortKey`, `toggleable`, `meta`) live on `columnDef` because that
   * is the object the caller actually wrote.
   */
  const headerGroup = table.getHeaderGroups()[0];

  const visibleHeaders = useMemo(
    () => headerGroup?.headers.filter((header) => !header.isPlaceholder && header.column.getIsVisible()) ?? [],
    [headerGroup],
  );

  const toggleableCount = useMemo(
    () => columns.filter((column) => column.toggleable !== false).length,
    [columns],
  );

  const handleSort = (columnDef: DataTableColumn<T>) => {
    const sortKey = columnDef.sortKey;
    if (!sorting || !sortKey) return;

    const isSame = sorting.sort === sortKey;
    // Cycle asc → desc → unsorted, so a user can get back to the default order.
    if (!isSame) sorting.onSortChange(sortKey, "asc");
    else if (sorting.order === "asc") sorting.onSortChange(sortKey, "desc");
    else sorting.onSortChange(undefined, "desc");
  };

  if (error) {
    return (
      <ErrorState
        description={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {toolbar || toggleableCount < columns.length ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>

          {toggleableCount < columns.length ? (
            <DropdownMenu>
              {/* This shadcn build is on @base-ui/react, whose composition API is
                  `render={<Component />}` rather than Radix's `asChild`. */}
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" aria-label="Choose columns" />
                }
              >
                <Settings2 className="mr-2 size-3.5" aria-hidden="true" />
                Columns
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Visible columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllLeafColumns().map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                    onSelect={(event) => event.preventDefault()}
                    className="capitalize"
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="table" rows={Math.min(pagination?.pageSize ?? 10, 10)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          {/*
            Horizontal overflow rather than a card-per-row layout on small
            screens: an appointment list where each row is a different height is
            much harder to scan than a scrollable table, and the scroll container
            is keyboard-reachable.
          */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              {caption ? (
                <caption className="sr-only">{caption}</caption>
              ) : null}
              <TableHeader>
                <TableRow>
                  {visibleHeaders.map((header) => {
                    const def = header.column.columnDef as DataTableColumn<T>;
                    const isSortable = Boolean(sorting && def.sortKey);
                    const active = isSortable && sorting?.sort === def.sortKey;
                    const align = def.meta?.align;

                    return (
                      <TableHead
                        key={header.id}
                        scope="col"
                        aria-sort={
                          active
                            ? sorting?.order === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={cn(
                          isSortable && "cursor-pointer select-none",
                          def.meta?.nowrap && "whitespace-nowrap",
                          align === "right" && "text-right",
                          align === "center" && "text-center",
                        )}
                      >
                        {isSortable ? (
                          /*
                           * A real <button> rather than a click handler on the
                           * <th>: it is focusable, activates on Enter/Space, and
                           * announces itself. The aria-sort on the <th> tells
                           * assistive tech the current direction.
                           */
                          <button
                            type="button"
                            onClick={() => handleSort(def)}
                            className="inline-flex items-center gap-1.5 rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {active ? (
                              sorting?.order === "asc" ? (
                                <ArrowUp className="size-3.5" aria-hidden="true" />
                              ) : (
                                <ArrowDown className="size-3.5" aria-hidden="true" />
                              )
                            ) : (
                              <ChevronsUpDown
                                className="size-3.5 opacity-40"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row.original);
                            }
                          }
                        : undefined
                    }
                    // Only advertise clickability when a row actually navigates.
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? "button" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            meta?.align === "right" && "text-right tabular-nums",
                            meta?.align === "center" && "text-center",
                            meta?.nowrap && "whitespace-nowrap",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination ? (
            <TablePagination {...pagination} />
          ) : null}
        </>
      )}
    </div>
  );
}

function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Icon-only helper for a column that shows visibility state. */
export function ColumnVisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <Eye className="size-3.5" aria-hidden="true" />
  ) : (
    <EyeOff className="size-3.5" aria-hidden="true" />
  );
}

export { ArrowUpDown };