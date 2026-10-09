import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";

/**
 * Request boundary checks.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (the file convention is
 * deprecated, not removed — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 *
 * What this file does, deliberately and no more:
 *
 *   - redirects browsers with no valid session cookie away from /dashboard
 *   - preserves where they were headed so login can send them back
 *
 * What it does NOT do: authorize anything. Role, account status, tenant and
 * permission are all resolved from the database in `src/lib/authz/session.ts`, and
 * every page, server action and route handler calls a guard before touching data.
 * A redirect here can be bypassed by anyone who wants to; the guards downstream
 * are the actual boundary. That split is also why this file stays small and
 * edge-safe.
 *
 * The session is read with `getToken`, which decrypts the Auth.js cookie using
 * AUTH_SECRET and touches no database. Importing `@/auth` here would drag Prisma
 * into the proxy, and proxy runs on *every* request including static assets.
 */

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: env.AUTH_SECRET,
    // Dev runs on http://localhost, so the cookie is unprefixed there.
    secureCookie: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
  });

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );

  /*
   * A signed-in visitor has no business on a login or registration screen, and
   * bouncing them here is what stops the "logged in but still on /login" loop after
   * `change-passwordAction` clears `mustChangePassword`.
   */
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/change-password");

  if (isProtected && !token) {
    const url = new URL("/login", request.url);
    // Preserve where they were headed so login can send them back. `safeCallbackUrl`
    // in the login action refuses anything that is not a same-origin relative path.
    if (pathname !== "/") url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   - _next/static, _next/image  (build output)
     *   - favicon.ico and common public assets
     *   - files with an extension (uploads, icons, sw.js)
     *
     * API routes are excluded: they authorize themselves per-route and returning a
     * redirect from a proxy would produce a confusing 200-with-HTML where a JSON
     * 401 is expected.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};