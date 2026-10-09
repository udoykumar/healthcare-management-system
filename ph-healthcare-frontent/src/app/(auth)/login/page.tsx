import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "@/app/(auth)/actions";
import { LoginForm } from "@/app/(auth)/login/login-form";

/**
 * Email + password sign-in.
 *
 * The form itself is a client component because `useActionState` owns the pending
 * state; the page only decides the copy and where a successful login lands.
 * `callbackUrl` comes from the query string so a user who was deep-linked to a
 * protected page arrives where they were going — `loginAction` refuses anything
 * that is not a same-origin relative path.
 */

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Use the email address your healthcare center registered for you.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm action={loginAction} callbackUrl={callbackUrl} />

        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <p className="text-muted-foreground">
            New patient?{" "}
            <Link
              href="/register"
              className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Create an account
            </Link>
          </p>
          <p className="text-muted-foreground">
            <Link
              href="/forgot-password"
              className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Forgot your password?
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}