"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { changePasswordAction } from "@/app/(auth)/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/action-state";
import { SubmitButton } from "@/components/forms/action-form";
import { FormError, FormField } from "@/components/forms/form-primitives";

/**
 * Changes the signed-in user's password.
 *
 * On success the router refreshes so the server re-reads the account: the
 * `mustChangePassword` flag is cleared by the action, and without a refresh the
 * dashboard layout would keep redirecting back here.
 *
 * `pushToDashboard` is false when the change was compulsory — the dashboard
 * redirect loop was what brought the user here, and navigating on success is what
 * breaks it.
 */
export function ChangePasswordForm({
  action,
  pushToDashboard = true,
}: {
  action: typeof changePasswordAction;
  pushToDashboard?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.status !== "success") return;

    if (pushToDashboard) router.push("/dashboard");
    else router.refresh();
  }, [state, pushToDashboard, router]);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm"
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <span>{state.message}</span>
      </div>
    );
  }

  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state.status === "error" ? state.message : null} />

      <FormField
        id="currentPassword"
        name="currentPassword"
        type="password"
        label="Current password"
        autoComplete="current-password"
        required
        autoFocus
        error={fieldError("currentPassword")}
      />
      <FormField
        id="password"
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        description="At least 8 characters."
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