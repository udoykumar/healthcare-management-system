"use client";

import { useActionState } from "react";

import { registerAction } from "@/app/(auth)/actions";
import { INITIAL_ACTION_STATE } from "@/lib/auth/action-state";
import { SubmitButton } from "@/components/forms/action-form";
import {
  FormControl,
  FormError,
  FormField,
  FormSection,
} from "@/components/forms/form-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { RegisterableCenter } from "@/app/(auth)/register/centers";

/**
 * Patient registration form.
 *
 * Server-action form rather than React Hook Form, deliberately and consistently
 * across the app: the action is the only thing that can create the account, and
 * it validates with the same Zod schema this form's `required`/`minLength`
 * attributes mirror. Adding a second client-side validation path (RHF + a
 * resolver) would duplicate those rules in two places, and Zod has to run on the
 * server regardless — so the rules live in `lib/validations/shared.ts` and the
 * HTML attributes are only there to give immediate feedback.
 *
 * The native `required`/`type` attributes are kept on every control so the form
 * still submits and validates usefully with JavaScript unavailable.
 */

const GENDER_OPTIONS = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "UNDISCLOSED", label: "Prefer not to say" },
] as const;

export function RegisterForm({
  action,
  centers,
}: {
  action: typeof registerAction;
  centers: RegisterableCenter[];
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);
  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.status === "error" ? state.message : null} />

      <FormSection
        title="About you"
        description="Use your legal name — it appears on prescriptions and lab reports."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="firstName"
            name="firstName"
            label="First name"
            autoComplete="given-name"
            required
            autoFocus
            error={fieldError("firstName")}
          />
          <FormField
            id="lastName"
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            required
            error={fieldError("lastName")}
          />
        </div>

        <FormField
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          label="Date of birth"
          autoComplete="bday"
          required
          error={fieldError("dateOfBirth")}
        />

        <FormControl
          id="gender"
          label="Gender"
          required
          error={fieldError("gender")}
        >
          <Select name="gender" defaultValue="">
            <SelectTrigger
              id="gender"
              name="gender"
              className="w-full"
              aria-required="true"
            >
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormControl>
      </FormSection>

      <FormSection
        title="Contact"
        description="We use these to reach you about appointments and results."
      >
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          inputMode="email"
          required
          error={fieldError("email")}
        />
        <FormField
          id="phone"
          name="phone"
          type="tel"
          label="Mobile number"
          autoComplete="tel"
          inputMode="tel"
          required
          error={fieldError("phone")}
        />
      </FormSection>

      <FormSection
        title="Healthcare center"
        description="Your records, appointments and invoices belong to this center."
      >
        <FormControl
          id="healthcareCenterId"
          label="Healthcare center"
          required
          error={fieldError("healthcareCenterId")}
        >
          <Select name="healthcareCenterId" defaultValue="">
            <SelectTrigger
              id="healthcareCenterId"
              name="healthcareCenterId"
              className="w-full"
              aria-required="true"
            >
              <SelectValue placeholder="Select a center" />
            </SelectTrigger>
            <SelectContent>
              {centers.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  {center.city ? `${center.name} — ${center.city}` : center.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormControl>
      </FormSection>

      <FormSection title="Password" description="At least 8 characters.">
        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          minLength={8}
          error={fieldError("password")}
        />
        <FormField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          error={fieldError("confirmPassword")}
        />
      </FormSection>

      <div className="space-y-2">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="acceptTerms"
            name="acceptTerms"
            value="true"
            required
            className="mt-0.5"
          />
          <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
            I consent to my health information being stored and processed by this
            healthcare center for the purpose of my care and billing.
          </Label>
        </div>
        {fieldError("acceptTerms") ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {fieldError("acceptTerms")}
          </p>
        ) : null}
      </div>

      <SubmitButton pending={isPending} className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}