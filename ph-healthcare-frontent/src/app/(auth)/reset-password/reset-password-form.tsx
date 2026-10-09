"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/action-state";
import { SubmitButton } from "@/components/forms/action-form";
import { FormError, FormField } from "@/components/forms/form-primitives";

/**
 * Sets a new password from a single-use reset token.
 *
 * On success the user is sent to sign in rather than straight to the dashboard:
 * `resetPasswordAction` bumps `sessionVersion`, which invalidates every existing
 * session — so a straight redirect would bounce them back to the login screen
 * anyway, just less clearly.
 */
export function ResetPasswordForm({
  action,
  token,
}: {
  action: typeof resetPasswordAction;
  token: string;
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);
  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-6 text-center"
      >
        <CheckCircle2 className="size-6 text-emerald-600" aria-hidden="true" />
        <p className="text-sm text-foreground">{state.message}</p>
        <Link
          href="/login"
          className="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.status === "error" ? state.message : null} />

      <input type="hidden" name="token" value={token} />

      <FormField
        id="password"
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        autoFocus
        error={fieldError("password")}
      />
      <FormField
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={fieldError("confirmPassword")}
      />

      <SubmitButton pending={isPending} className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}