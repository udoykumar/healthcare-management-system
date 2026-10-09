import { PageSpinner } from "@/components/shared/states";

/**
 * Route-level loading state for the dashboard.
 *
 * Cached by the client router, so navigating between dashboard pages shows this
 * while the next segment's data is fetched rather than flashing an empty shell.
 */
export default function DashboardLoading() {
  return <PageSpinner label="Loading dashboard" />;
}
