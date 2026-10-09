import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { KeyRound } from "lucide-react";

import { auth } from "@/auth";
import { ROLE_HOME } from "@/config/navigation";
import { loadAuthorizedUser, requireUser } from "@/lib/authz/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { changePasswordAction } from "../(auth)/actions";
import { ChangePasswordForm } from "./change-password-form";

/**
 * Password change for a signed-in account.
 *
 * Lives outside `(auth)` and outside `/dashboard` on purpose. `requireDashboardContext`
 * redirects anyone with `mustChangePassword` here, so this route must not sit
 * behind the dashboard layout (that would loop), and it must not sit in the auth
 * group (that layout redirects signed-in users to their dashboard, which is also
 * where this page sends them once the flag clears).
 *
 * The "required" banner appears when `?required=true`, which is how the redirect
 * from the dashboard distinguishes an admin-issued temporary password from a
 * voluntary change.
 */

export const metadata: Metadata = {
  title: "Change password",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage({
  searchParams,
}: PageProps<"/change-password">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/change-password");
  }

  const user = requireUser(await loadAuthorizedUser(session.user.id));
  const params = await searchParams;
  const isRequired = params.required === "true" || user.mustChangePassword;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="size-4.5 text-primary" aria-hidden="true" />
              {isRequired ? "Set a new password" : "Change your password"}
            </CardTitle>
            <CardDescription>
              {isRequired
                ? "Your account was created with a temporary password. Choose your own before continuing."
                : "Choose a password you do not use anywhere else."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ChangePasswordForm action={changePasswordAction} pushToDashboard={!isRequired} />

            {isRequired ? null : (
              <Button variant="ghost" className="w-full" render={<Link href={ROLE_HOME[user.role]} />}>
                Back to dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}