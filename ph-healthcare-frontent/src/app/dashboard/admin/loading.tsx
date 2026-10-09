import { LoadingSkeleton } from "@/components/shared/states";

/**
 * Dashboard skeleton (§42).
 *
 * A skeleton rather than a spinner: the dashboard's shape is known ahead of time
 * — a row of stat tiles, then two columns of charts — so laying that out now stops
 * the page jumping when the real numbers arrive.
 *
 * `aria-busy` and the visually hidden "Loading" text come from `LoadingSkeleton`,
 * so the wait is announced rather than being a silent blank area.
 */
export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>

      <LoadingSkeleton variant="cards" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg bg-muted lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}