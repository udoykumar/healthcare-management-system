# API

## Scope

There are two ways into this application, and the distinction is deliberate.

**Server Actions** are used for everything the UI does. They are POSTs, so Next
verifies the Origin/Host pair before invoking them — CSRF protection without a
token — and they are plain HTTP, so the same validation, rate limiting and audit
logging apply as to any endpoint.

**Route Handlers** are for genuinely external consumers: integrations, mobile
clients, anything that is not this UI. So far: notifications.

Most of the REST surface described below is not built yet. See the README's "What is
not built yet" section.

## Response envelope

One shape for success, one for failure, always.

```jsonc
// Success
{
  "success": true,
  "message": "Notifications retrieved",
  "data": { "items": [ /* … */ ] },
  "meta": {
    "page": 1, "pageSize": 20, "total": 137,
    "totalPages": 7, "hasNext": true, "hasPrevious": false
  }
}

// Failure
{
  "success": false,
  "message": "Please correct the highlighted fields and try again.",
  "code": "VALIDATION_FAILED",
  "errors": [{ "path": "email", "message": "Enter a valid email address." }]
}
```

`message` is written to be shown to a user. `code` is the stable identifier clients
switch on — never branch on `message`.

## Status codes

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success |
| 400 | Malformed request (bad id, bad JSON) |
| 401 | No session, or the session is invalid |
| 403 | Session valid, but not allowed — wrong role, missing permission, suspended account |
| 404 | Does not exist **or** not visible to this caller |
| 422 | Validation failed; `errors` lists the fields |
| 429 | Rate limited |
| 500 | Unexpected — logged with a correlation id, never leaked |

### 404 rather than 403

A row that exists but is not visible to the caller returns 404. Distinguishing "no
such record" from "not yours" would confirm the existence of a record the caller is
not entitled to know about.

## Writing a route handler

```ts
import { PERMISSIONS } from "@/lib/authz/permissions";
import { requireScopedUser } from "@/lib/authz/api";
import { buildMeta, ok, withErrorHandling } from "@/lib/api/response";

export const GET = withErrorHandling(async (request: Request) => {
  // 1. Authorize first. `scope` comes back with the user so the query cannot
  //    accidentally be unscoped.
  const { user, scope } = await requireScopedUser(PERMISSIONS.PATIENT_READ);

  // 2. Validate and bound the query string.
  const query = await parseListParams(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
    {
      sortableColumns: ["createdAt", "lastName"],  // allow-list; no user input
      fallbackSort: "createdAt",
      filterKeys: ["status"],
    },
  );

  // 3. Query a service — never Prisma directly from a handler.
  const page = await listPatients(scope, query);

  // 4. Return the standard envelope.
  return ok(
    { items: page.items },
    "Patients retrieved",
    { meta: buildMeta(page.page, page.pageSize, page.total) },
  );
});
```

`withErrorHandling` turns any thrown `AppError` into the failure envelope, maps a
`ZodError` to 422 with per-field messages, and logs anything else with a
correlation id that is also returned — so a support request can be traced to a log
line without exposing a stack trace or a database message.

## Authentication

Session cookie, `SameSite=Lax`, `HttpOnly`, `Secure` in production. Every protected
handler calls a guard from `src/lib/authz/api.ts`; none of them read the cookie
themselves.

`proxy.ts` deliberately does not cover `/api/**`: a redirect from the proxy would
produce a confusing 200-with-HTML where a JSON 401 is expected.

## Current endpoints

### `GET /api/notifications`

Returns the **caller's own** notifications. Scoped by `userId` inside the service —
there is no parameter that could widen it, and no centre-wide notification listing
for ordinary roles, because a superadmin reading another tenant's notification
bodies would be a privacy hole.

Query: `?page=1&pageSize=20&search=&sort=createdAt&order=desc&type=&unread=true`

```jsonc
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "…", "code": "NTF-000001",
        "type": "LAB_REPORT_AVAILABLE",
        "title": "Your lab report is ready",
        "body": "Complete Blood Count has been released by the laboratory.",
        "actionUrl": "/dashboard/patient/laboratory",
        "readAt": null,
        "createdAt": "2026-10-03T09:12:44.101Z"
      }
    ]
  },
  "meta": { "page": 1, "pageSize": 20, "total": 3, "totalPages": 1, "hasNext": false, "hasPrevious": false }
}
```

Requires `notification:read-own`.

### `PATCH /api/notifications/:id/read`

Marks one notification read. Authorization is the `userId` inside the service's
`updateMany`, so an id belonging to another account matches nothing and returns 404.

### `DELETE /api/notifications/:id`

Removes one of the caller's own notifications. Same `userId`-scoped delete.

### `POST /api/notifications/mark-all-read`

Marks every unread notification for the caller read. Returns `{ "updated": 3 }`. A
second call correctly reports `0`.

## Planned endpoints

Declared here so the shape is agreed before it is written.

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/api/patients` | `patient:read` |
| `POST` | `/api/patients` | `patient:create` |
| `GET` | `/api/patients/:id` | `patient:read` / `patient:read-own` |
| `PATCH` | `/api/patients/:id` | `patient:update` |
| `DELETE` | `/api/patients/:id` | `patient:delete` (deactivate, never hard-delete) |
| `GET` | `/api/doctors` | `doctor:read` |
| `POST` | `/api/doctors` | `doctor:create` |
| `PATCH` | `/api/doctors/:id` | `doctor:update` |
| `GET` | `/api/appointments` | `appointment:read` |
| `POST` | `/api/appointments` | `appointment:create` |
| `GET` | `/api/appointments/slots` | `appointment:create` |
| `PATCH` | `/api/appointments/:id` | `appointment:update` |
| `POST` | `/api/appointments/:id/cancel` | `appointment:cancel` |
| `POST` | `/api/appointments/:id/reschedule` | `appointment:reschedule` |
| `GET` | `/api/prescriptions` | `prescription:read` |
| `POST` | `/api/prescriptions` | `prescription:create` |
| `GET` | `/api/laboratory/tests` | `lab-test:read` |
| `POST` | `/api/laboratory/requests` | `lab-request:create` |
| `GET` | `/api/invoices` | `invoice:read` |
| `POST` | `/api/invoices` | `invoice:create` |
| `POST` | `/api/invoices/:id/payments` | `payment:create` |
| `GET` | `/api/audit-logs` | `audit-log:read` |
| `GET` | `/api/centers` | `center:read` |

Rules for all of them:

- **Guard first, query second.** Never resolve data and check permission afterwards.
- **Scope from `requireScopedUser`,** never from a body or query parameter.
- **Money is never accepted from the client.** Totals are computed server-side from
  line items.
- **No clinical content in a list response** that the caller has no clinical
  permission to see. Use `patient:read` for demographics and `patient:view-clinical`
  for the chart.
- **Audit anything that changes state.**

## Rate limits

`src/lib/api/rate-limit.ts`, in-memory, per process.

| Operation | Limit | Key |
| --- | --- | --- |
| Login | 10 / 15 min | IP **and** account |
| Password reset | 3 / hour | email |
| Registration | 5 / hour | IP |
| Document upload | 30 / hour | user |
| General API | 600 / min | IP |

In-memory means the limit is per instance. Behind more than one instance, move
`BUCKETS` to Redis — `src/lib/db/` already has the pg client wired for it.

## What a response must never contain

- `passwordHash`, `sessionVersion`, `lockedUntil`, `failedLoginCount`,
  `mustChangePassword` — none of these have a slot in `SessionUser`
- Full card numbers — only `cardLast4`
- Raw database errors or stack traces
- Another tenant's rows
- A record's existence, where the caller is not entitled to know it