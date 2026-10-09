"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, MailWarning } from "lucide-react";

import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";
import type { ActionState } from "@/lib/auth/action-state";
import { SubmitButton } from "@/components/forms/action-form";
import { FormError, FormField } from "@/components/forms/form-primitives";
import { Button } from "@/components/ui/button";

/**
 * Two-step panel for the verification landing page.
 *
 * `verifyEmailAction` takes a plain token rather than being a `useActionState`
 * handler, because there is no form to submit — the token is already in the URL.
 * It is invoked inside a transition so the button still gets a pending state, and
 * the result is held locally instead of in action state.
 *
 * Resending is a real form with its own action state, so a "we sent another
 * email" answer survives being re-rendered.
 */
export function VerifyEmailPanel({
  token,
}: {
  verifyAction: (token: string) => Promise<ActionState>;
  resendAction: (
    previous: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  token: string;
}) {
  const [result, setResult] = useState<ActionState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const verify = () => {
    startTransition(async () => {
      setResult(await verifyEmailAction(token));
    });
  };

  if (result.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-6 text-center"
      >
        <CheckCircle2 className="size-6 text-emerald-600" aria-hidden="true" />
        <p className="text-sm text-foreground">{result.message}</p>
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
    <div className="space-y-4">
      <FormError message={result.status === "error" ? result.message : null} />

      <Button
        type="button"
        onClick={verify}
        disabled={isPending}
        aria-busy={isPending}
        className="w-full"
      >
        {isPending ? "Verifying…" : "Verify my email"}
      </Button>

      <ResendVerificationForm />
    </div>
  );
}

function ResendVerificationForm() {
  const [state, formAction, isPending] = useActionState(
    resendVerificationAction,
    { status: "idle" } as ActionState,
  );

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-4"
      >
        <MailWarning
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-2.5">
        <MailWarning
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Didn&apos;t get the email?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Send a fresh verification link to your inbox.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-2" noValidate>
        <FormField
          id="resend-email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          error={state.status === "error" ? state.fieldErrors?.email : undefined}
        />
        <SubmitButton pending={isPending} variant="outline" size="sm">
          Resend verification email
        </SubmitButton>
      </form>
    </div>
  );
}