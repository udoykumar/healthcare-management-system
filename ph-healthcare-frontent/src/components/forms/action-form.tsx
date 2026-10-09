"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/forms/form-primitives";
import type { ActionState } from "@/lib/auth/action-state";

/**
 * Submit button and form-level status for server-action forms.
 *
 * Two behaviours worth noting:
 *
 *  1. The pending state disables the button *and* sets `aria-busy`, so the
 *     control is genuinely inert rather than merely spinning.
 *  2. It takes the `ActionState` shape used by every server action in the app,
 *     which is what lets one component render success, a top-level error and
 *     per-field errors consistently.
 */

export function SubmitButton({
  pending,
  children,
  className,
  variant = "default",
  size = "default",
}: {
  pending: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          <span>Working…</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export type FormSubmitHandler = (
  previousState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

/**
 * Wraps a server action into the `useActionState` contract, raising a toast on
 * success and returning the state on failure.
 *
 * Success is toasted rather than rendered inline: the user has usually navigated
 * away by then, or is waiting on a refresh, so an inline message they never look at
 * would be worse than an unambiguous corner notification.
 */
export function useFormAction(action: FormSubmitHandler) {
  const [isPending, startTransition] = useTransition();

  const run = async (formData: FormData) => {
    startTransition(async () => {
      const result = await action({ status: "idle" }, formData);

      if (result.status === "success") {
        toast.success(result.message);
      }
    });
  };

  return { run, isPending };
}

/** Server-action form wrapper that wires pending state, errors and toasts. */
export function ActionForm({
  action,
  children,
  className,
  onSuccess,
  successMessage,
}: {
  action: FormSubmitHandler;
  children: (state: ActionState, isPending: boolean) => React.ReactNode;
  className?: string;
  onSuccess?: (state: ActionState) => void;
  successMessage?: string;
}) {
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);

      if (result.status === "success") {
        toast.success(successMessage ?? result.message);
        onSuccess?.(result);
      }
    });
  };

  return (
    <form action={handleSubmit} className={cn("space-y-4", className)} noValidate>
      <FormError message={state.status === "error" ? state.message : null} />
      {children(state, isPending)}
    </form>
  );
}

/** Renders a per-field error message under an input. */
export function FieldError({
  state,
  name,
}: {
  state: ActionState;
  name: string;
}) {
  if (state.status !== "error" || !state.fieldErrors) return null;
  const message = state.fieldErrors[name];
  if (!message) return null;

  return (
    <p role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

export { toast };