"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/(auth)/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/action-state";
import { SubmitButton } from "@/components/forms/action-form";
import { FormError, FormField } from "@/components/forms/form-primitives";

/**
 * Sign-in form.
 *
 * `noValidate` on the form (set by `ActionForm`) plus Zod on the server is the
 * arrangement used across the app: the browser's own bubble messages are
 * suppressed so the styling and the copy are ours, and the authoritative check
 * runs server-side anyway.
 *
 * The password field is deliberately `autoComplete="current-password"` and the
 * email field `autoComplete="username"` so a password manager offers the right
 * credential instead of creating a new one.
 */
export function LoginForm({
  action,
  callbackUrl,
}: {
  action: typeof loginAction;
  callbackUrl?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.status === "error" ? state.message : null} />

      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      <FormField
        id="email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="username"
        inputMode="email"
        required
        autoFocus
        placeholder="you@example.com"
        aria-describedby={
          state.status === "error" && state.fieldErrors?.email ? "email-error" : undefined
        }
        error={state.status === "error" ? state.fieldErrors?.email : undefined}
      />

      <FormField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={state.status === "error" ? state.fieldErrors?.password : undefined}
      />

      <SubmitButton pending={isPending} className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}