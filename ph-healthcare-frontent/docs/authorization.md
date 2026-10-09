# Authorization

## The one rule

**Hiding a control is not authorization.** A missing nav item, a disabled button and
a `return null` in the UI are all cosmetic. Anything the browser can send must be
re-checked on the server.

Concretely: a patient who removes the CSS from a button, or calls a route handler
directly, gets the same answer as a patient who never saw the button.

## Three layers, in order

| Layer | Question | Where |
| --- | --- | --- |
| Proxy | Is there a session cookie at all? | `src/proxy.ts` |
| Role gate | Is this role allowed in this URL space? | `requireDashboardContext` |
| Permission | Does this role hold this specific grant? | `requirePermission` |

Plus, inside every service, the data-scoping layer — see
[`architecture.md`](architecture.md#multi-tenancy).

## The guards

From `src/lib/authz/session.ts`, for Server Components:

```ts
requireUser(user)                          // signed in and account usable
requireRole(user, ...roles)                // one of these roles
requirePermission(user, permission)        // holds this grant
requireAnyPermission(user, ...permissions) // any of these
requireVerifiedEmail(user)                 // confirmed address (clinical data)
requirePasswordChanged(user)               // past the temporary password

can(user, permission)                      // non-throwing; for deciding what to render
canAny(user, ...permissions)
hasRole(user, ...roles)
```

From `src/lib/authz/api.ts`, for route handlers — same rules, plus the session is
pulled out of the request first:

```ts
requireRequestUser()
requireScopedUser(permission)      // returns { user, scope } — the tenant, ready
requireRequestRole(...roles)
requireRequestPermission(permission)
requireClinicalUser()              // verified email, for anything clinical
```

`requireScopedUser` returns the scope alongside the user on purpose. A handler that
receives the scope cannot forget to filter by centre, because there is nothing else
in scope to query with.

## Why permissions are re-read from the database

`loadAuthorizedUser` runs a query per request (memoized per render with React
`cache`, so a layout, a page and the sidebar share it). Permissions are **not**
cached in the JWT.

The reason: a JWT is a signed claim, not a live view of the account. If
permissions lived in the token, a demoted admin or a blocked doctor would keep
working until their token expired — up to eight hours. Re-deriving from the
database means a role change or a suspension takes effect on the very next request.

What *is* in the token: the user id, and nothing else.

## Permission catalogue

`src/lib/authz/permissions.ts` is the single source of truth for the *set* of valid
codes. `PERMISSIONS` is a const object, so `Permission` is a union of string literals
and a typo in `requirePermission("patinet:read")` is a compile error rather than a
silent denial.

Codes are `resource:action`, lowercase.

### The `_OWN` convention

Permissions come in pairs:

```
patient:read       view any patient in the centre
patient:read-own   view your own patient record
```

They are separate grants rather than one overloaded permission. That is what lets a
doctor read their own chart without being handed read on every patient in the
centre — and it is why the doctor role has **no** `patient:read` at all. A doctor's
patient list is derived from their own appointments (`listDoctorPatients`), so
there is no centre-wide list for them to accidentally query.

The same reasoning applies to `prescription:read` / `prescription:read-own`,
`invoice:read` / `invoice:read-own`, `lab-result:read` / `lab-result:read-own`,
`schedule:read` / `schedule:read-own`, and so on.

### Notable grants

| Permission | Who holds it | Why |
| --- | --- | --- |
| `patient:view-clinical` | admin | Clinical access for billing and audit, separate from demographics |
| `appointment:create-own` | patient | Self-booking |
| `record:create` / `record:update` | doctor | Documenting consultations |
| `prescription:create` | doctor | Prescribing |
| `lab-result:create` | admin | Entering results — not the doctor who ordered them |
| `invoice:*`, `payment:*` | admin | Billing |
| `user:role-change` | superadmin, admin | Privilege changes are audited |
| `permission:manage` | superadmin | Editing what roles grant |
| `center:status-change` | superadmin | Activating a centre |

## Role grants

`DEFAULT_ROLE_PERMISSIONS` in `src/lib/authz/permissions.ts` is the **seed** for
the `role_permissions` table, not a runtime check. At runtime the grants come from
the database, which is what lets a superadmin change what a role can do without a
deployment.

`SUPERADMIN` is deliberately absent from that map. It is resolved through
`Role.isSuperuser`, which every guard short-circuits on — so the superadmin's access
does not silently change when a permission row is edited.

## Privilege escalation guards

`ROLE_ASSIGNABLE_BY` decides who may hold which role:

| Target role | May be assigned by |
| --- | --- |
| `SUPERADMIN` | `SUPERADMIN` only |
| `ADMIN` | `SUPERADMIN`, `ADMIN` |
| `DOCTOR` | `SUPERADMIN`, `ADMIN` |
| `PATIENT` | any role |

An admin can therefore create a doctor but cannot create another admin's equal, and
nobody but a superadmin can mint a superadmin.

The database agrees: `RolePermission` and `AuditLog.moderatedBy` cascade rather
than restrict, but `Appointment.patientId`, `MedicalRecord.patientId` and the money
tables use `onDelete: Restrict` so a clinical or financial row cannot be removed by
deleting its owner.

## Domain rules enforced in the services

Authorization is not only permissions. These live with the data they protect:

| Rule | Where |
| --- | --- |
| A doctor sees only patients they have an appointment with | `medical-record.service.ts` → `assertPatientReadable` |
| A patient is pinned to their own `patientId` | `appointment`, `prescription`, `billing` services |
| Notifications are scoped to the caller's own `userId` | `notification.service.ts` |
| Marking a notification read uses `updateMany` with `userId` | `notification.service.ts` |
| A doctor cannot edit a record another doctor wrote | planned in `lib/authz/clinical.ts` |
| A review needs a completed appointment, one per appointment | `reviewSchema` + the `uq_review_appointment` index |

The notification one is worth spelling out: it uses `updateMany` rather than
`update` because `update` takes an id and trusts it, while `updateMany` takes a
`where` that includes the caller's own id. Guessing someone else's notification id
matches nothing.

## Patient privacy

- A row that exists but is not visible to the caller returns **404, not 403**.
- APIs return the minimum: `toSessionUser` projects a `User` down to a shape with no
  `passwordHash`, `sessionVersion`, `lockedUntil` or `mustChangePassword`. A field
  that should never leave the server has no slot in the interface.
- Audit metadata holds identifiers and counts, not clinical content.
- `robots` is `noindex, nofollow` at the root and again on every dashboard layout.
- Documents will be served only through an authorised route handler, never from a
  public URL. (Not implemented yet — see the README's "not built" section.)

## Auditing

`src/lib/audit/log.ts`. Append-only; never updated or deleted by application code.

Audited actions include: every login and logout, failed logins, password changes and
resets, email verification, user creation / update / role change / status change /
deletion, centre status changes, patient and doctor lifecycle, appointment
booking / reschedule / cancellation / status change, medical record and diagnosis
creation, prescription creation, medicine changes and stock adjustments, lab
requests and results, invoices and payments (including refunds), reviews, document
uploads, settings changes and permission changes.

Each row records the actor, the action, the entity, the entity id, the IP, the user
agent, whether it succeeded, a short machine-readable reason, and a metadata blob.

Two rules about metadata:

- **No free-text secrets.** `reason` is a short code (`invalid_credentials`,
  `role_denied`), never a message.
- **No clinical content.** A patient's symptoms do not belong in a table that centre
  administrators can read.

## Adding a permission

1. Add it to `PERMISSIONS` and to `PERMISSION_DESCRIPTIONS`.
2. Add it to `DEFAULT_ROLE_PERMISSIONS` for the roles that should have it.
3. Add it to the nav entry in `src/config/navigation.ts` if it gates a menu item.
4. Enforce it with `requirePermission` in the page or the route handler.
5. Scope the query in the service.
6. Add a case to `scripts/smoke.py` if it changes who can reach what.