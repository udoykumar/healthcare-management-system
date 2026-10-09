import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The three states every data view needs (§42): loading, empty and error.
 *
 * Building these once means a missing empty state can never read as a broken
 * page, and the retry affordance is consistent. Each accepts its own icon so the
 * state still reads correctly next to specific copy.
 */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this data. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <AlertCircle className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 size-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Placeholder rows for a table-shaped loading state.
 *
 * `variant="table"` matches the DataTable's geometry so the layout does not jump
 * when data arrives.
 */
export function LoadingSkeleton({
  className,
  variant = "block",
  rows = 5,
}: {
  className?: string;
  variant?: "block" | "table" | "cards";
  rows?: number;
}) {
  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading…</span>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-12 w-full animate-pulse rounded-md bg-muted"
            style={{ animationDelay: `${index * 60}ms` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
        aria-busy="true"
      >
        <span className="sr-only">Loading…</span>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

/**
 * A full-page centred spinner for route-level `loading.tsx`.
 * Deliberately plain — a skeleton is wrong here because there is no data shape yet.
 */
export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  );
}