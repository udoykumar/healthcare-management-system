"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * Client-side providers.
 *
 * Isolated into its own client component so the root layout — and every page
 * under it — can stay a Server Component. Only this boundary and whatever it wraps
 * ship JavaScript.
 *
 * TanStack Query is configured with `staleTime: 30s` because this app's reads are
 * overwhelmingly admin lists over data that changes on a human timescale. The
 * default of 0 would refetch on every mount and every focus.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Never retry an authorization or validation failure; it will fail
              // identically every time and each retry is another 401 in the logs.
              const status = (error as { status?: number } | undefined)?.status;
              if (status === 401 || status === 403 || status === 404) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          {/*
            Rich colours for the destructive and warning variants; `richColors`
            would also colour informational toasts, which reads as an error.
          */}
          <Toaster position="top-right" closeButton richColors={false} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}