"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Segment error boundary (§42).
 *
 * Required to be a Client Component with a `reset` callback — that is the
 * Next.js contract for recovering from an error without a full page load.
 *
 * The message shown to the user is the generic one. A thrown AppError's message is
 * safe (it was written for display), but a Prisma or unexpected error would leak
 * schema detail, so only the known-safe case is passed through and everything else
 * gets the generic copy. The real error still reaches the server log.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[dashboard] segment error:", error);
  }, [error]);

  /*
   * `useRouter().push` rather than `window.location.assign`: the latter is a full
   * page load, which throws away the client router cache and re-fetches the
   * dashboard shell for no benefit.
   */
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <AlertTriangle className="size-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">This page could not be loaded</h2>
        <p className="text-sm text-muted-foreground">
          Something went wrong while preparing the page. You can try again, or go
          back to your dashboard.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RotateCw className="mr-2 size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
