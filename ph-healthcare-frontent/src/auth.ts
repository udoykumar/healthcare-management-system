import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authenticateWithPassword } from "@/lib/auth/credentials";
import { env } from "@/lib/env";
import { authConfig } from "@/auth.config";

/**
 * Auth.js (NextAuth v5) entry point.
 *
 * Split into two files on purpose:
 *
 *   - `auth.config.ts`  — edge-safe. Holds the shared `authorized` callback and
 *                         the trust-host setting. `proxy.ts` imports this, and
 *                         proxy must not pull in Prisma.
 *   - `auth.ts`         — node-only. Wires the Credentials provider and the
 *                         database session lookups. Server actions and route
 *                         handlers import this.
 *
 * Sessions are JWTs. There is no `Session` table, because a stateless token plus a
 * per-request database check (src/lib/authz/session.ts) already gives immediate
 * revocation, and it avoids a session row per device.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    // Short-lived on purpose: authorization is re-derived from the database on
    // every request, so a leaked token is useful for as long as it is valid and
    // no longer. See src/lib/authz/session.ts.
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email : "";
        const password = typeof raw?.password === "string" ? raw.password : "";

        if (!email || !password) return null;

        const result = await authenticateWithPassword(email, password);

        if (!result.ok) {
          // Returning null makes Auth.js show its own generic error. The specific
          // reason is deliberately dropped here to avoid an enumeration oracle.
          return null;
        }

        return { id: result.userId, email };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Puts the minimum on the token that the proxy and server components need.
     * Permissions are deliberately NOT cached here — they are resolved from the
     * database by `loadAuthorizedUser`, so a permission change applies at once
     * rather than when the token happens to be refreshed.
     */
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    /**
     * Projects the token onto the session.
     *
     * Without this, `session.user.id` is `undefined` for a JWT session — Auth.js
     * only carries `name`/`email`/`picture` across by default — and every guarded
     * page would read "not signed in" for a signed-in visitor. `role` is included
     * for UI affordances only; authorization never reads it (§37).
     */
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
} satisfies NextAuthConfig);

/**
 * Reads the signed-in user from the request, or null.
 *
 * Use this in Server Components. Pair it with a guard —
 * `requireUser(await getAuthorizedUser())` — rather than trusting its return value.
 */
export async function getAuthorizedUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { loadAuthorizedUser } = await import("@/lib/authz/session");
  return loadAuthorizedUser(userId);
}

export type AppSession = typeof auth;