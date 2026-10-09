import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * 404 for a missing dashboard route (§42).
 *
 * Sends the user back to their dashboard rather than a hard-coded role, because
 * this file is rendered without knowing which account hit it.
 */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <SearchX className="size-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist, or you do not have access to
          it.
        </p>
      </div>

      <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
    </div>
  );
}
