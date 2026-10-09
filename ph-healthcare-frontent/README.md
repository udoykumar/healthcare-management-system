# PH Healthcare

A multi-tenant healthcare management system for a clinic, hospital or medical
centre. Patients register and book; doctors document consultations, diagnose and
prescribe; the laboratory issues results; billing reconciles invoices against what
actually happened — and every one of those actions is authorized on the server and
written to an audit log.

This is a **records and workflow system**. It does not diagnose, and it does not
make clinical decisions. Those remain the responsibility of qualified healthcare
professionals.

---

## Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | React Server Components, Route Handlers, Server Actions |
| UI | React 19 + TypeScript (strict) | `tsc --noEmit` is part of `npm run verify` |
| Styling | Tailwind CSS v4 + shadcn/ui | `@base-ui/react` primitives, `next-themes` for dark mode |
| Database | PostgreSQL + Prisma 7 | Multi-file schema under `prisma/schema/` |
| Auth | Auth.js (NextAuth v5) | Credentials provider, JWT sessions, scrypt password hashing |
| Validation | Zod v4 | One schema shared by client and server |
| Tables | TanStack Table v8 | One reusable `DataTable`, server-driven |
| Charts | Recharts | Four thin wrappers in `src/components/charts/` |
| Email | Nodemailer | Provider-agnostic; console transport when `EMAIL_SERVER` is empty |
| Tests | Vitest | Unit tests for the business rules that actually cost something |

---

## Quick start

Requirements: **Node.js 20+** and a running **PostgreSQL 14+**.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    Then edit DATABASE_URL and AUTH_SECRET.
#    Generate a secret:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 3. Create the database and apply migrations
createdb ph_healthcare
npx prisma migrate deploy     # or `npm run prisma:migrate` in development

# 4. Generate the client and load demo data
npx prisma generate
npm run db:seed

# 5. Run
npm run dev                    # http://localhost:3000
```

### Demo accounts

Every seeded account uses the password **`Demo@12345`**. All data is fictional.

| Role | Email | Lands on |
| --- | --- | --- |
| Superadmin | `superadmin@demo.example` | Platform-wide view across all centres |
| Admin | `admin@demo.example` | The demo centre's operations |
| Staff | `staff@demo.example` | Centre operations (ADMIN role) |
| Doctor | `doctor@demo.example` | Clinical dashboard |
| Patient | `patient@demo.example` | Their own appointments and records |
| Patient (unverified) | `patient.pending@demo.example` | Login is blocked until the address is verified |

The seed creates **two** healthcare centres. That is deliberate: the second one
exists so tenant isolation can be tested rather than assumed.

### Verifying the install

```bash
npm run verify      # prisma validate + typecheck + lint + build
npm test            # unit tests
npm run smoke       # hits every route as every role against a running dev server
```

`npm run smoke` is the check worth running after any change to a page, a service or
`auth.ts`. It logs in through the real Auth.js endpoint, checks each route renders
content unique to that role, and asserts that no role can reach another's area.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then a production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm test` / `test:watch` | Vitest |
| `npm run verify` | Everything that must pass before a commit |
| `npm run smoke` | Role-by-role HTTP smoke test (needs `npm run dev`) |
| `npm run prisma:migrate` | Create and apply a development migration |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:studio` | Browse the database |
| `npm run db:seed` | Load demo data (idempotent) |
| `npm run db:reset` | Drop, migrate and re-seed |

---

## Environment variables

See `.env.example` for the annotated list. The ones that matter most:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. A dedicated **database**, not just a schema — Prisma 7 always qualifies tables with `public`. |
| `AUTH_SECRET` | Signs and encrypts session cookies. **Generate a fresh random value.** |
| `NEXT_PUBLIC_APP_URL` | Canonical URL. Used in metadata, emails and password-reset links. |
| `EMAIL_SERVER` | SMTP URL. Empty ⇒ emails are logged to the console instead of sent. |
| `STORAGE_*` | Private object storage for medical documents. Never served from a public URL. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the REST API. |
| `ENABLE_REMINDER_JOBS` | Master switch for the appointment-reminder job. Off by default. |

`.env` is gitignored. Never commit it.

---

## Project structure

```
prisma/
  schema/            12 files: models grouped by domain, all enums in one
  migrations/        Applied migrations, including hand-written guards
  seed.ts            Idempotent demo data

src/
  proxy.ts           Next 16 request boundary: session cookie check only
  auth.config.ts     Edge-safe Auth.js config
  auth.ts            Node Auth.js instance (Credentials + JWT session)

  app/
    (auth)/          login, register, forgot/reset password, verify email
    dashboard/       The authenticated shell + four role areas
      _lib/          Shared server helpers (role gate, tolerant counters)
      {role}/        One folder per role, each guarding its own routes
    api/             REST handlers (notifications today)
    change-password/ Outside both (auth) and /dashboard, deliberately

  components/
    ui/              shadcn/ui components (Base UI, not Radix)
    tables/          data-table.tsx (presentational) + server-data-table.tsx (URL-bound)
    forms/           Form primitives + the server-action form wrapper
    charts/          Recharts wrappers
    dashboard/       Shell chrome, agenda, notifications screen
    shared/          Page header, stat card, states, status badge, pagination

  lib/
    auth/            Password hashing (scrypt), one-time tokens, action state
    authz/           Permission catalogue, session projection, guards
    api/             Response envelope, validation, rate limiting, list params
    db/              Prisma client, tenant scoping, code counters
    validations/     Every Zod schema in the system
    email/           Transport + templates
    audit/           Audit-log writer
    utils/           Formatting and date/time helpers

  services/          The only place Prisma is called from the app
  test/              Vitest unit tests
docs/                Architecture, database, auth, authorization, API
```

---

## Architecture in one page

**The rule that shapes everything:** a page never talks to Prisma. It asks a
service, the service applies tenant scoping, and the page renders what comes back.

```
proxy.ts            session cookie present?  →  redirect to /login
  ↓
page.tsx            role gate (requireDashboardContext) + permission (requirePermission)
  ↓
service             scopeToCenter() + role's own-identity filter + validate query params
  ↓
Prisma              PostgreSQL
```

Why it is layered this way:

- **Tenant scoping is decided once.** `scopeToCenter` in `src/lib/db/tenant.ts` is
  the single definition of "which centre's data". A `healthcareCenterId` of `null`
  means platform-level (superadmin only); anything else is pinned to one centre.
- **Authorization is server-side and re-derived.** Permissions are resolved from
  the database on every request, so blocking an account or changing a role takes
  effect immediately rather than when a token happens to expire.
- **Hiding a control is never the boundary.** Nav items are filtered by permission
  so the UI makes sense, but the page and the service enforce the same rule
  independently.

See [`docs/architecture.md`](docs/architecture.md) for the full picture,
[`docs/authorization.md`](docs/authorization.md) for the permission model, and
[`docs/database.md`](docs/database.md) for the schema.

---

## Roles at a glance

| | Superadmin | Admin | Doctor | Patient |
| --- | --- | --- | --- | --- |
| Scope | All centres | Own centre | Own caseload | Own records |
| Patients | all | all | treated only | self |
| Clinical records | read | read (if granted) | read + write own | read own |
| Prescribing | — | — | create + issue | read own |
| Billing | read | full | read | own invoices, pay |
| Audit log | platform | own centre | — | — |
| Can change roles | yes | admin/doctor/patient | — | — |

Permissions are rows in the database, not an enum in code, so a superadmin can
change what a role grants at runtime without a migration.

---

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. `npm ci && npm run build`
3. `npx prisma migrate deploy` — **never** `prisma migrate dev` in production.
4. `npm start`
5. Seed only if you want demo data. Leave it off for a real deployment.
6. Terminate TLS in front of the app: the `Strict-Transport-Security` header and
   the secure session cookie both assume HTTPS.

The build needs `DATABASE_URL` and `AUTH_SECRET` present at build time, because
`prisma generate` and the route-type generation read them.

---

## What is not built yet

Listed honestly so nobody assumes it exists:

- **Write paths.** Every screen is read-only. Appointment booking, consultation
  entry, prescribing, lab result entry, invoicing and payment capture have schemas
  and validated inputs but no server action or route handler yet.
- **The slot engine.** `DoctorSchedule` and `DoctorLeave` exist and
  `rangesOverlap`/`minutesFromHHmm` are tested, but nothing yet computes bookable
  slots from them.
- **PDF generation.** `@react-pdf/renderer` is installed and `src/lib/pdf/` is
  empty. Prescriptions, invoices and lab reports are HTML-only.
- **Document storage.** `src/lib/storage/` is empty. `MedicalDocument` stores a
  `storageKey`, and there is no uploader or download route yet — which means no
  file can currently leak publicly, but uploads are not possible either.
- **Reminder jobs.** `sendAppointmentReminderBatch` exists; there is no scheduler
  and `ENABLE_REMINDER_JOBS` gates nothing yet.
- **The rest of the nav.** `src/config/navigation.ts` declares ~45 routes. The ones
  listed above are not implemented yet; anything missing falls through to the
  dashboard `not-found.tsx`.