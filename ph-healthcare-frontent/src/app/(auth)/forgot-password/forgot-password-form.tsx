"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/action-state";
import { SubmitButton } from "@/components/forms/action-form";
import { FormError, FormField } from "@/components/forms/form-primitives";

/**
 * Requests a password reset link.
 *
 * The confirmation copy is deliberately identical whether or not the address is
 * registered — `forgotPasswordAction` returns the same success state either way,
 * because a different answer would turn this page into a way to discover which
 * patients are registered with the clinic.
 */
export function ForgotPasswordForm({
  action,
}: {
  action: typeof forgotPasswordAction;
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-6 text-center"
      >
        <MailCheck className="size-6 text-teal-600" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <p className="text-xs text-muted-foreground">
          The link expires in 60 minutes. Check your spam folder if it has not
          arrived.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.status === "error" ? state.message : null} />

      <FormField
        id="email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        error={state.status === "error" ? state.fieldErrors?.email : undefined}
      />

      <SubmitButton pending={isPending} className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}