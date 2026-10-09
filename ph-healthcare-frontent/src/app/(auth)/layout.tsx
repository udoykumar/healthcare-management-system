import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Activity, Lock, ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { loadAuthorizedUser } from "@/lib/authz/session";
import { ROLE_HOME } from "@/config/navigation";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

/**
 * Shell for the unauthenticated screens (login, register, password reset).
 *
 * Two things this layout is responsible for beyond presentation:
 *
 *  1. An already-signed-in visitor is sent to their dashboard instead of being
 *     shown a login form. Done here rather than in `proxy.ts` because the proxy
 *     deliberately cannot decode the token — it only knows a cookie exists.
 *  2. The healthcare/privacy notice is on every auth screen, so a patient handing
 *     their details to this form is told where they go.
 */

export const metadata: Metadata = {
  title: {
    default: "Sign in",
    template: "%s · PH Healthcare",
  },
  robots: { index: false, follow: false },
};

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  if (session?.user?.id) {
    const user = await loadAuthorizedUser(session.user.id);

    if (user && user.status === "ACTIVE" && !user.mustChangePassword) {
      redirect(ROLE_HOME[user.role]);
    }
    // A user who still owes a password change goes to /change-password instead;
    // that page has no auth layout, so the redirect cannot loop.
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,26rem)]">
      {/*
        Brand panel. Hidden below `lg` where there is no room for it and the form
        is the only thing the visitor came for.
      */}
      <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-slate-100 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(60rem 40rem at 10% 0%, rgb(13 148 136 / 0.35), transparent 60%), radial-gradient(50rem 30rem at 90% 100%, rgb(37 99 235 / 0.3), transparent 60%)",
          }}
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">PH Healthcare</span>
        </Link>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            One record per patient, from booking to lab report to invoice.
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            Appointments, consultations, prescriptions, laboratory results and
            billing in one place — with every access recorded.
          </p>

          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-teal-400" aria-hidden="true" />
              Passwords hashed with scrypt and never returned by the API.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-teal-400"
                aria-hidden="true"
              />
              Role-based authorization checked on the server for every request.
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">
          This system records and manages clinical data. It does not diagnose or
          make clinical decisions — those remain the responsibility of qualified
          healthcare professionals.
        </p>
      </aside>

      <div className="flex min-w-0 flex-col bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded text-sm font-medium text-foreground lg:invisible"
          >
            <Activity className="size-4 text-teal-600" aria-hidden="true" />
            PH Healthcare
          </Link>
          <ThemeToggle />
        </div>

        <main id="main-content" className="flex flex-1 items-start px-6 pb-12 sm:items-center">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}