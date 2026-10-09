import { LoadingSkeleton } from "@/components/shared/states";

/** Table-shaped skeleton for the notifications screen. */
export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <LoadingSkeleton variant="table" rows={8} />
    </div>
  );
}
