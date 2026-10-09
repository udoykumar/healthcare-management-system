import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Lock,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { listRegisterableCenters } from "@/app/(auth)/register/centers";
import { auth } from "@/auth";

/**
 * Public landing page.
 *
 * Deliberately thin: it introduces the product and routes to sign-in. It renders
 * *outside* the dashboard shell, so anything it queries is public data only — the
 * only database read is the same public center list the registration form uses,
 * and only to show that the platform has clinics to join.
 */

export const metadata: Metadata = {
  title: "Healthcare Management System",
  description:
    "PH Healthcare manages patients, doctors, appointments, clinical records, laboratory results, prescriptions and billing for a healthcare center.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PH Healthcare — Healthcare Management System",
    description:
      "Appointments, clinical records, laboratory results, prescriptions and billing in one place.",
    url: "/",
  },
};

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Appointments & scheduling",
    body: "Doctor rotas with breaks and leave, double-booking prevented at the database level, and a status flow from booking to completion.",
  },
  {
    icon: ClipboardList,
    title: "Clinical records",
    body: "Consultation notes, vital signs, diagnoses and prescriptions, appended rather than overwritten so the history stays intact.",
  },
  {
    icon: FlaskConical,
    title: "Laboratory workflow",
    body: "Test catalogue with parameters and reference ranges, request-to-report tracking, and abnormal-value flagging.",
  },
  {
    icon: CreditCard,
    title: "Billing & payments",
    body: "Invoices calculated server-side from line items, part payments, refunds recorded as new rows, and printable receipts.",
  },
] as const;

export default async function HomePage() {
  const [session, centers] = await Promise.all([
    auth(),
    listRegisterableCenters(),
  ]);

  const signedInHref = session?.user?.id ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Activity className="size-4.5" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              PH Healthcare
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
            <ThemeToggle />
            {!session?.user?.id ? (
              <>
                <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                  Sign in
                </Button>
                <Button size="sm" render={<Link href="/register" />}>
                  Register
                </Button>
              </>
            ) : (
              <Button size="sm" render={<Link href="/dashboard" />}>
                Go to dashboard
                <ArrowRight className="ml-2 size-3.5" aria-hidden="true" />
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <Badge variant="outline" className="gap-1.5">
              <Stethoscope className="size-3" aria-hidden="true" />
              For clinics, hospitals and multi-branch centers
            </Badge>

            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
              The clinical record, the appointment book and the invoice — in one
              system.
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
              PH Healthcare gives a healthcare center a single, tenant-scoped place
              to run its day: patients book and attend, doctors document and
              prescribe, the laboratory reports results, and billing reconciles
              against what actually happened.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href={signedInHref} />}>
                {session?.user?.id ? "Open your dashboard" : "Sign in to your center"}
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/register" />}
              >
                Register as a patient
              </Button>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              Every action is authorized on the server and recorded in an audit log.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              What the system covers
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Four roles with separate dashboards and separate permissions: platform
              superadmin, center admin, doctor, and patient.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="border-border/70">
                  <CardHeader>
                    <span
                      className="flex size-9 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-400"
                      aria-hidden="true"
                    >
                      <feature.icon className="size-4.5" />
                    </span>
                    <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Centers */}
        {centers.length > 0 ? (
          <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Register with a healthcare center
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Pick the center you attend; your records stay with that center.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {centers.slice(0, 9).map((center) => (
                <li key={center.id}>
                  <Card className="h-full border-border/70">
                    <CardContent className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{center.name}</p>
                        {center.city ? (
                          <p className="text-sm text-muted-foreground">
                            {center.city}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link href="/register" />
                        }
                      >
                        Register
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              PH Healthcare — a management system, not a diagnostic tool. Clinical
              decisions remain the responsibility of qualified healthcare
              professionals.
            </p>
            <nav className="flex gap-4 text-sm" aria-label="Footer">
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-muted-foreground hover:text-foreground"
              >
                Register
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}