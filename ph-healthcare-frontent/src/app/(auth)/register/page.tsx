import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerAction } from "@/app/(auth)/actions";
import { RegisterForm } from "@/app/(auth)/register/register-form";
import { listRegisterableCenters } from "@/app/(auth)/register/centers";

/**
 * Patient self-registration.
 *
 * Registration is patient-only by design: a visitor cannot pick their own role,
 * because the role is written server-side from a constant in `registerAction`
 * rather than from the form. Doctors, staff and admins are created by an
 * administrator and receive an invitation.
 *
 * The centre list comes from a query that returns only ACTIVE centres' id, name
 * and city — enough to choose one, and nothing that identifies the platform's
 * other tenants.
 */
export default async function RegisterPage() {
  const centers = await listRegisterableCenters();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Create your patient account</CardTitle>
        <CardDescription>
          Register once, then book appointments, view lab reports and prescriptions,
          and pay invoices online.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {centers.length === 0 ? (
          <div
            role="status"
            className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          >
            Online registration is not available right now. Please contact your
            healthcare center to be registered.
          </div>
        ) : (
          <RegisterForm action={registerAction} centers={centers} />
        )}

        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login"
            className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}