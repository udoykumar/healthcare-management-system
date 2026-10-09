# Architecture

## The shape of a request

```
Browser
  │
  ├─ src/proxy.ts ──────────── session cookie present?  →  redirect to /login
  │
  ├─ app/dashboard/{role}/page.tsx
  │     ├─ requireDashboardContext([RoleKey])   role gate, redirects elsewhere
  │     └─ requirePermission(user, "patient:read")  refuses without the grant
  │
  ├─ src/services/*.service.ts
  │     ├─ scopeToCenter(scope)          pin to one centre (or none, superadmin)
  │     ├─ role's own-identity filter    doctor → own appointments, patient → own
  │     ├─ parseListParams               clamp page size, allow-list the sort column
  │     └─ prisma.findMany + prisma.count
  │
  └─ React Server Component renders the rows
```

Each layer is independently sufficient to stop a request. Removing the proxy still
leaves the page guard; removing the page guard still leaves the service's tenant
filter. That redundancy is deliberate — a proxy redirect is a UX affordance that
anyone can bypass, and a hidden nav item is not a security control at all.

## Layers, and what each one is responsible for

### `src/proxy.ts` — request boundary

Next 16 renamed `middleware.ts` to `proxy.ts`. This file does exactly two things:
redirect a browser with no session cookie away from `/dashboard`, and send a
signed-in visitor away from the login screens.

It reads the session with `getToken` from `next-auth/jwt`, which decrypts the
cookie using `AUTH_SECRET` and touches no database. Importing `@/auth` here would
drag Prisma into the proxy, and the proxy runs on every request including static
assets.

It does **not** authorize anything.

### `src/app/**/page.tsx` — Server Components

Pages are Server Components by default. They are `async`, they read `searchParams`
directly, and they never hold a client-side data cache. The only Client Components
in a page are the ones that need interactivity: the data table's controls, the
charts, the theme toggle, the notification bell.

A page's job is: guard, query a service, render. It never builds a `where` clause.

### `src/services/*.service.ts` — data access

The only place in the application that calls Prisma. Each service owns:

- the tenant filter (`scopeToCenter`)
- the role's own-identity filter (a doctor sees only their appointments)
- conversion of Prisma shapes into serializable ones (`Decimal` → `number`,
  nested relations → flat display fields)
- the mapping from a public sort key to a real `orderBy` (a doctor's "name" lives on
  the related `User` row, so the service turns `{name}` into `{user: {name}}`)

`src/services/_shared.ts` holds what is genuinely common: the `ListQuery` shape,
`toNumber`, `searchOr`, `asEnumValue`, the day-boundary helpers and the month-series
builder. Nothing in it imports a specific model.

### `src/lib/` — cross-cutting concerns

- `auth/` — scrypt hashing, one-time tokens, the `ActionState` shape
- `authz/` — the permission catalogue, the session projection, the guards
- `api/` — the response envelope, Zod helpers, rate limiting, list-parameter parsing
- `db/` — the Prisma client, tenant scoping, atomic code counters
- `validations/` — every Zod schema in the system, imported by both sides
- `email/` — transport plus ten templates, none of which knows about the domain
- `audit/` — the audit-log writer
- `utils/` — formatting and date/time

## Multi-tenancy

One mechanism, one definition.

A `User.healthcareCenterId` of `null` means platform-level. Only `SUPERADMIN` gets
that. For every other role `scopeToCenter` requires a centre id and adds it to the
query:

```ts
scopeToCenter(scope, { status: "ACTIVE" })
// SUPERADMIN  → { status: "ACTIVE" }
// ADMIN       → { status: "ACTIVE", healthcareCenterId: "hc_1" }
// throws       → a non-superadmin session with no centre (a broken session)
```

Failing closed on that last case is the point: an unscoped query on a broken
session would return another tenant's rows, and a broken session is exactly the
situation where you cannot reason about what the user meant.

Role-scoping sits on top of tenant-scoping, because "which centre" and "whose data
within it" are different questions:

| Role | Tenant filter | Own-identity filter |
| --- | --- | --- |
| SUPERADMIN | none | none |
| ADMIN | `healthcareCenterId` | none |
| DOCTOR | `healthcareCenterId` | `doctorId = <session>` |
| PATIENT | `healthcareCenterId` | `patientId = <session>` |

The own-identity filter is applied **after** any filter from the query string, so
`?patientId=<someone else>` intersects to nothing rather than widening the result.

## Rendering strategy

Server Components for everything that is data. Client Components only where there
is interaction:

| Component | Why it is client |
| --- | --- |
| `server-data-table.tsx` | Search debounce, filter dropdowns, pagination — all URL updates |
| `charts.tsx` | Recharts measures the DOM |
| `notification-bell.tsx` | Lazy-fetches its own list on open |
| `theme-toggle.tsx` | `next-themes` needs the browser |
| `action-form.tsx` | `useActionState` owns the pending state |

Because Server Components cannot pass a function to a Client Component, the chart
components take a `valueFormat` **descriptor** (`{kind: "currency", currency}`) and
build the `Intl.NumberFormat` on the client. Passing a formatter callback is a
render-time error, not a type error, which is why the API is shaped this way.

## Forms

Server Actions rather than React Hook Form, consistently. The reasoning:

- Zod has to run on the server regardless, and it has to be the *same* schema the
  user saw while typing. One definition, imported by both, is how that is achieved.
- Server Actions get CSRF protection from Next's Origin/Host check without a token.
- `useActionState` covers what RHF would have provided: pending state, per-field
  errors, top-level error, toast on success.

`ActionState` and `INITIAL_ACTION_STATE` live in `src/lib/auth/action-state.ts`,
not next to the actions, because a `"use server"` module may only export async
functions.

## Error handling

`AppError` carries a `status`, a stable `code` and a user-safe `message`.
`handleApiError` turns it into the standard failure envelope; an unknown error is
logged with a correlation id that is also returned to the caller, so support can
trace it without a stack trace or a database message reaching the browser.

A row that exists but is not visible to the caller is reported as **404, not 403**.
Distinguishing the two would confirm the existence of a record the caller is not
entitled to know about.

## Multi-branch / multi-tenant readiness

Adding a second branch is adding a `HealthcareCenter` row. The schema already
carries `healthcareCenterId` on every centre-specific table, and the seed creates
two centres precisely so the isolation is demonstrable rather than assumed.

What is *not* ready: no branch-level department configuration, no cross-branch
reporting, and no per-branch branding on generated documents.

## Background work

`ENABLE_REMINDER_JOBS` and `sendAppointmentReminderBatch` exist. There is no
scheduler yet. When one is added it must be an external trigger (cron hitting a
route handler, or a worker process), not a `setInterval` in the app — a serverless
deployment will not run it, and one that does will run it once per warm instance.

## Testing strategy

`test/` holds unit tests for the rules where a regression costs something: password
hashing and policy, token generation, rota overlap, the validation schemas, and
pagination bounds.

`scripts/smoke.py` covers what unit tests cannot: that each route renders for the
right role and that no role can reach another's area. It caught five real bugs that
compiled cleanly — a missing Auth.js `session` callback that made every guarded
page think nobody was signed in, a proxy that passed `auth: null` to the
`authorized` callback, `isDeleted` applied to models that do not have that column,
a formatter function passed across the RSC boundary, and `orderBy` columns that
belonged to a different model.