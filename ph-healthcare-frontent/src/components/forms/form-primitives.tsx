"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Form primitives (§29, §33).
 *
 * Every field in the app is built from these, which is what keeps the
 * label/description/error association consistent. The important accessibility
 * detail: `aria-describedby` is wired to the description *and* the error, and
 * `aria-invalid` flips when there is an error — a screen reader then announces
 * "invalid entry" and reads the reason, rather than leaving the user to find the
 * red text themselves.
 */

type FieldShellProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
  /** Rendered on the right of the label, e.g. an optional badge. */
  labelAdornment?: ReactNode;
};

function FieldShell({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
  labelAdornment,
}: FieldShellProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
        {labelAdornment}
      </div>

      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      {/*
        Children render their own input. `FormField` below handles the plain
        <input> case and wires these ids automatically; `FormControl` is for
        anything custom (Select, date picker, command palette) where the caller
        spreads `describedBy`/`invalid` onto its own control.
      */}
      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
} & Omit<ComponentProps<"input">, "id">;

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ className, id, label, description, error, required, ...inputProps }, ref) {
    return (
      <FieldShell
        id={id}
        label={label}
        description={description}
        error={error}
        required={required}
      >
        <input
          ref={ref}
          id={id}
          name={id}
          aria-describedby={describe(id, description, error)}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors",
            "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
            className,
          )}
          {...inputProps}
        />
      </FieldShell>
    );
  },
);

function describe(id: string, description?: string, error?: string): string | undefined {
  return (
    [description ? `${id}-description` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

/**
 * The `aria-*` props a custom control must spread onto its focusable element, so
 * the label/description/error association survives whatever widget is inside.
 */
export type ControlAriaProps = {
  id: string;
  name: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

/** Plain container for a custom control (Select, DatePicker, Command). */
export function FormControl({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
  labelAdornment,
}: FieldShellProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
      labelAdornment={labelAdornment}
    >
      {children}
    </FieldShell>
  );
}

/**
 * A short, single-line error summary shown at the top of a long form.
 *
 * Complements the per-field messages rather than replacing them: after a failed
 * submit, a user needs to know something went wrong without scrolling a 20-field
 * form hunting for red text.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

/** Section heading inside a multi-part form. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {/*
        A real <fieldset>/<legend> pair, so a screen reader announces the group
        name as the user tabs into it.
      */}
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      {description ? (
        <p className="-mt-2 text-xs text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </fieldset>
  );
}