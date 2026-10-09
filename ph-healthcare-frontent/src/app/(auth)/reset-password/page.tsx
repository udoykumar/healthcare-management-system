import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

/**
 * Consumes a password reset token from the email link.
 *
 * The token travels in the query string and is rendered as a hidden field, not
 * used server-side to set the password directly: the page is cacheable and the
 * actual verification happens inside `resetPasswordAction`, which burns the token
 * on success. A missing token short-circuits to an explanation rather than a
 * form that could only ever fail.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          Setting a new password signs you out everywhere else.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {token ? (
          <ResetPasswordForm action={resetPasswordAction} token={token} />
        ) : (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center"
          >
            <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
            <p className="text-sm text-foreground">
              This reset link is incomplete.
            </p>
            <p className="text-xs text-muted-foreground">
              Request a new link — reset tokens can only be used once and expire
              after 60 minutes.
            </p>
            <Link
              href="/forgot-password"
              className="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Request a new link
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}