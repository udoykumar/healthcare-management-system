import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your PH Healthcare account.",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we will send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ForgotPasswordForm action={forgotPasswordAction} />

        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          <Link
            href="/login"
            className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}