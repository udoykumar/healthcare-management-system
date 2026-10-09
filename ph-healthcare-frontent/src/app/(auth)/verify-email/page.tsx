import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { verifyEmailAction, resendVerificationAction } from "@/app/(auth)/actions";
import { VerifyEmailPanel } from "@/app/(auth)/verify-email/verify-email-panel";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

/**
 * Email verification landing page.
 *
 * Verification is an explicit button press rather than an automatic call on page
 * load. A link from an email client is a GET, and triggering a state change from
 * a GET makes the action replayable by anything that can make the browser load a
 * URL — a mail scanner, a chat preview. The token is only marked used when the
 * user presses the button.
 */
export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Confirm your email address</CardTitle>
        <CardDescription>
          Verifying activates your account so you can sign in.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {token ? (
          <VerifyEmailPanel
            verifyAction={verifyEmailAction}
            resendAction={resendVerificationAction}
            token={token}
          />
        ) : (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm"
          >
            <p className="text-foreground">This verification link is incomplete.</p>
            <p className="mt-1 text-muted-foreground">
              Sign in and request a new verification email if you still need to
              confirm your address.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <p className="text-muted-foreground">
            <Link
              href="/login"
              className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Go to sign in
            </Link>
          </p>
          <p className="text-muted-foreground">
            Wrong healthcare center?{" "}
            <Link
              href="/register"
              className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Register again
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}