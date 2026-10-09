import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration.
 *
 * `proxy.ts` imports this file, and proxy code cannot depend on Prisma or any
 * Node built-in — it may run outside the main runtime. Everything here is
 * therefore limited to reading the session cookie.
 *
 * This is deliberately an *optimistic* check. It answers "does this browser hold
 * a session cookie at all?" and nothing more. Real authorization — role, status,
 * tenant, permission — happens in `src/lib/authz/session.ts` against the database,
 * because a proxy redirect is a user-experience affordance, not a security
 * boundary, and every route is guarded independently anyway.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  trustHost: true,
  session: { strategy: "jwt" as const },
  callbacks: {
    /**
     * Restricts `/dashboard/**` to browsers that have a session. Anything else
     * (public pages, API routes, auth pages) passes through untouched; the
     * individual routes enforce their own access rules.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isDashboard = pathname.startsWith("/dashboard");
      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");

      if (isAuthPage) return true;
      if (isDashboard) return Boolean(auth?.user);
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;