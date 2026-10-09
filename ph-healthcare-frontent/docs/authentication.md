# Authentication

## Stack

Auth.js (NextAuth v5) with the Credentials provider and **JWT** sessions. There is
no `Session` or `Account` table: the token *is* the session, and revocation is
handled by fields on `User` rather than by deleting a session row per device.

## Two Auth.js configurations, on purpose

| File | Runtime | Contains |
| --- | --- | --- |
| `src/auth.config.ts` | edge-safe | pages, trustHost, session strategy, the `authorized` callback |
| `src/auth.ts` | node-only | Credentials provider, the JWT/session callbacks, database lookups |

`src/proxy.ts` imports only the first, because proxy code must not pull in Prisma.

## Sign-in flow

```
Browser → POST /api/auth/callback/credentials
            │
            ├─ double-submit CSRF: the `authjs.csrf-token` cookie holds
            │  "token|hash"; Auth.js verifies hash == HMAC(token, AUTH_SECRET)
            │  and requires the POST body to carry the token half
            │
            ├─ authenticateWithPassword(email, password)      src/lib/auth/credentials.ts
            │     ├─ user lookup (email, case-insensitive)
            │     ├─ account checks: isDeleted, status, lockedUntil, emailVerified
            │     ├─ verifyPassword (scrypt, timing-safe compare)
            │     ├─ failedLoginCount / lockedUntil bookkeeping
            │     └─ mustChangePassword → set on the token
            │
            └─ jwt callback: token.userId = user.id
               session callback: session.user.id = token.userId
```

The `session` callback is not optional decoration. Auth.js carries `name`, `email`
and `picture` across by default and nothing else, so without it `session.user.id`
is `undefined` for a JWT session and every guarded page reads "not signed in". That
was a real bug in this codebase, found by the smoke test rather than the compiler.

## Password hashing

scrypt from `node:crypto`, not bcrypt. Memory-hard, in the standard library, no
native build step and no third-party crypto in the trust path.

```
Format: scrypt$N$r$p$<salt base64url>$<derived key base64url>
Params: N = 2^15, r = 8, p = 1  (RFC 9106 guidance)
```

Parameters live *inside* the hash. `verifyPassword` reads the cost from the stored
string, so they can be raised later without invalidating existing passwords, and
`needsRehash` flags an older, weaker hash for an upgrade on next sign-in.

Two details that matter:

- **Normalisation.** Both sides apply `NFKC` before hashing, so visually identical
  passwords match.
- **Constant time for a missing account.** `verifyPassword(x, null)` still burns a
  hash before returning `false`, so an unknown email and a wrong password take
  about the same time. Without that, response latency enumerates which addresses
  are registered.

## Password policy

Length-first, not composition-first (`src/lib/auth/password.ts`):

- 10–200 characters
- not entirely numeric

Forcing symbol classes mostly produces `Password1!`. A long passphrase beats a
short "complex" password, and the length rule is the one that actually holds.

## Sessions

JWT, `maxAge` 8 hours, `updateAge` 1 hour. Short-lived on purpose: authorization is
re-derived from the database on every request, so a leaked token is useful for as
long as it is valid and no longer. `User.sessionVersion` bumps to invalidate every
issued session at once — used on block, on delete, and on password reset (the old
password may be compromised; that is the entire reason someone is resetting it).

## One-time tokens

`VerificationToken` stores **only** a SHA-256 digest. The raw token goes out in the
email and is never persisted, so a leaked table cannot be replayed against a live
account.

| Purpose | TTL |
| --- | --- |
| Email verification | 24 hours |
| Password reset | 60 minutes |
| Staff invitation | 7 days |

Tokens are single-use: consumed on success, and any other outstanding tokens for
the same address and purpose are deleted. A reset therefore invalidates every
other reset link that was in flight.

## Account states

| `UserStatus` | Login | Dashboard |
| --- | --- | --- |
| `PENDING_VERIFICATION` | blocked | — |
| `ACTIVE` | allowed | allowed |
| `INACTIVE` | blocked | — |
| `BLOCKED` | blocked | — |
| `DELETED` | blocked | — |

Sign-in with an unverified address is allowed only while the account is
`PENDING_VERIFICATION`, so a user who never received the verification mail can
still get in. Once active, anything touching clinical data requires a verified
address (`requireVerifiedEmail`).

`mustChangePassword` is set on admin-issued accounts. `requireDashboardContext`
redirects to `/change-password?required=true`, which sits outside both the auth
layout and the dashboard layout so the redirect cannot loop.

## CSRF

- **Server Actions:** Next.js verifies the Origin/Host pair before invoking one. No
  token needed.
- **Auth.js endpoints:** double-submit cookie (above).
- **REST route handlers:** `ALLOWED_ORIGINS` is the allow-list, and every
  mutating handler must re-check the session server-side.

## Registration is patient-only

`registerSchema` has **no `role` field**, and the role is written server-side from
`RoleKey.PATIENT` in `registerAction`. Giving the schema a place for a role would
only create something for a caller to tamper with. Doctors, staff and admins are
created by an administrator.

Registration also refuses mismatched passwords in the schema, not just the action —
`registerAction` only ever reads `input.password`, so without the check a typo in
the confirmation field would be silently ignored.

## Rate limiting

`src/lib/api/rate-limit.ts`, applied to sensitive operations:

| Operation | Limit |
| --- | --- |
| Login | per IP **and** per account |
| Registration | per IP |
| Password reset | per email |

The per-account login limit is the one that matters: without it, an attacker with
many IPs can lock a real patient out by grinding their address.

## Security headers

Set in `next.config.ts` for every response, including error pages:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`, no framing, no objects |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (fallback for very old agents) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation, payment all denied |
| `Strict-Transport-Security` | 2 years, `includeSubDomains`, `preload` |

The CSP currently allows `'unsafe-inline'` and `'unsafe-eval'` for scripts because
Next injects inline bootstrap code and the dev runtime needs eval. Moving to
per-request nonces is the next step and needs header plumbing; it is noted in
`next.config.ts` rather than silently omitted.

## Checklist for a new auth-sensitive change

- [ ] Does it read the role from the database, not from the token?
- [ ] Is the tenant filter applied?
- [ ] Is the row-level identity filter applied, or is that deliberate?
- [ ] Does a missing-but-existing row return 404 rather than 403?
- [ ] Is anything sensitive in the response that does not need to be?
- [ ] Is the action written to the audit log?