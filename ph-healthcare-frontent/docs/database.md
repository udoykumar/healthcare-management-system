# Database

PostgreSQL + Prisma 7. 41 models, 32 enums, 1,900 lines of schema across 12 files.

## Schema layout

`prisma/schema/` is a directory, not a single file, so a domain can be read without
wading past nine unrelated tables:

| File | Domain |
| --- | --- |
| `schema.prisma` | generator + datasource only |
| `enums.prisma` | **every** enum, so the vocabulary is reviewable in one place |
| `tenant.prisma` | `HealthcareCenter` |
| `auth.prisma` | `User`, `VerificationToken`, `PasswordHistory` |
| `rbac.prisma` | `Role`, `Permission`, `RolePermission` |
| `people.prisma` | `Doctor`, `Staff`, `Department` |
| `patient.prisma` | `Patient`, allergies, conditions, surgeries |
| `scheduling.prisma` | `DoctorSchedule`, `DoctorLeave`, `Appointment` |
| `clinical.prisma` | `MedicalRecord`, `VitalSign`, `Diagnosis`, `Prescription`, `Medicine`, stock, movements |
| `laboratory.prisma` | categories, tests, parameters, requests, results |
| `billing.prisma` | `Service`, `Invoice`, `InvoiceItem`, `Payment` |
| `engagement.prisma` | `Notification`, `Review`, `MedicalDocument`, `AuditLog`, `SystemSetting` |

## Tenancy

`HealthcareCenter` is the tenant boundary. Nearly every table carries
`healthcareCenterId`, and `User.healthcareCenterId = null` means *platform-level* —
which only `SUPERADMIN` has. Application code never interprets that null itself;
`scopeToCenter` in `src/lib/db/tenant.ts` is the single definition.

Two kinds of soft delete, and the distinction matters:

| Model | Mechanism | Why |
| --- | --- | --- |
| `User` | `isDeleted` boolean + `status: DELETED` | A deleted account keeps its email so it is never reissued |
| `MedicalDocument` | `isDeleted` boolean | Files are removed from storage but the metadata is retained |
| Everything else | `status: RecordStatus` (`ACTIVE`/`INACTIVE`) | A retired department, doctor or medicine is not a deletion |

Spreading `NOT_DELETED` into a query for a `RecordStatus` model is a runtime
`Unknown argument` error, not a compile error — which is why the constants are named
`USER_NOT_DELETED` and `RECORD_ACTIVE` rather than both being `NOT_DELETED`.

## Clinical rows are never hard-deleted

A medical record that can silently vanish is a compliance problem, not a UX one.

- `MedicalRecord.isVoided` + `voidedReason` marks a record created in error while
  keeping the prescriptions and lab requests attached to it.
- `Diagnosis.isSuperseded` + `supersededById` means a correction *adds* a diagnosis
  rather than overwriting the original. The "current diagnoses" list filters
  `isSuperseded: false`; the history keeps everything.
- `Invoice.isLocked` freezes line items once the invoice can no longer be edited.

## Timestamps and timezones

Every `DateTime` is stored as UTC and rendered in the centre's timezone.

Recurring availability is the exception, and deliberately: `DoctorSchedule.startTime`
is a wall-clock `"HH:mm"` string in the centre's zone, because that is what a rota
actually *is*. The slot engine converts between the two at booking time; nothing else
needs to care, and `minutesFromHHmm` / `hhmmFromMinutes` are pure string math with no
`Date` involved so no timezone can leak in.

This is also why the overlap constraint uses `tsrange` and not `tstzrange`: Prisma
maps `DateTime` to `TIMESTAMP(3)` without a time zone, and `tstzrange` depends on the
session `TimeZone`, which Postgres therefore refuses to index.

## Constraints in the database, not just the application

An application-level check has a race: two concurrent bookings can both pass a read
before either writes, because READ COMMITTED does not serialise them. These are
hand-written in
`prisma/migrations/20261003110000_appointment_overlap_guard/migration.sql`.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A doctor cannot hold two overlapping appointments.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_doctor_no_overlap"
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW', 'RESCHEDULED'));
```

Three details that are easy to get wrong:

- **`btree_gist`** is required to combine an equality operator with the range overlap
  operator in one GiST index.
- **PARTIAL**: cancelled, no-show and superseded rows no longer reserve the slot, so
  cancelling frees the time.
- **`[)`** half-open ranges: back-to-back appointments (10:00–10:20 and 10:20–10:40)
  are allowed. A closed range would forbid them.

Also enforced in SQL:

| Constraint | Guards |
| --- | --- |
| `appointments_end_after_start` | an appointment ends after it starts |
| `doctor_leaves_end_after_start` | a leave range is not inverted |
| `lab_result_value_has_a_reading` | a value is numeric **or** qualitative, never neither |
| `invoice_item_totals_non_negative` | quantity > 0, prices and totals ≥ 0 |
| `invoice_amounts_non_negative` | no negative money on an invoice |
| `payment_amounts_sane` | amount > 0; refunds ≤ amount |
| `review_rating_range` | rating between 1 and 5 |
| `medicine_stock_quantity_non_negative` | stock cannot go negative |
| `doctor_schedule_times_valid` | a rota block ends after it starts |

These exist so a bug in application code becomes a rejected write rather than
corrupt data.

## Cascading rules

`onDelete` is chosen per relationship, not blanket-applied:

| Rule | Where | Why |
| --- | --- | --- |
| `Cascade` | `User` → `Patient`/`Doctor`/`Staff` profile | The profile is meaningless without its account |
| `Cascade` | centre → everything scoped to it | Deleting a centre removes its whole world |
| `Cascade` | parent → owned rows (`Appointment` → `MedicalRecord`, `Invoice` → `InvoiceItem`) | Owned data has no meaning alone |
| `Restrict` | `Appointment.patientId`, `MedicalRecord.patientId`, `Invoice.patientId` | Clinical and financial history must survive the person |
| `Restrict` | `Payment.invoiceId` | You settle an invoice; you do not delete it by deleting a payment |
| `SetNull` | `Appointment.departmentId`, `PrescriptionItem.medicineId` | A withdrawn medicine must not erase the prescription line that recorded it |
| `SetNull` | `AuditLog.userId` | The log outlives the account |

## Uniqueness that encodes a rule

| Constraint | Rule |
| --- | --- |
| `User.email` | one account per address, enforced by the database not only by the action |
| `Appointment.appointmentNumber` | human-facing reference is unique |
| `Doctor.licenseNumber` | a licence belongs to one doctor |
| `RolePermission @@unique([roleId, permissionId])` | no duplicate grants |
| `Notification @@unique([userId, dedupeKey])` | the reminder job cannot send the same reminder twice |
| `Review @@unique([appointmentId])` | one review per appointment |
| `PrescriptionItem @@unique([labResultId…])` variants | one value per parameter per report |
| `(healthcareCenterId, name)` on department / service / lab test / medicine | catalogues are per-tenant, so two centres may each have "General Medicine" |
| `(healthcareCenterId, name, strength)` on medicine | the same drug at two strengths is two rows |

`@@unique` constraints that Prisma names explicitly (`uq_review_appointment`,
`uq_department_center_name`, …) are referenced by name in generated where-unique
inputs — but for a plain existence check, `findFirst` is more robust than
`findUnique`, because the generated name and the field can differ.

## Reference codes

Human-facing references (`PT-000007`, `APT-2026-000123`) come from counter tables,
not from `MAX(code) + 1`.

```sql
INSERT INTO code_counters ("prefix", value)
VALUES ($1, 1)
ON CONFLICT ("prefix") DO UPDATE SET value = code_counters.value + 1
RETURNING value
```

A read-then-write maximum is not atomic: two concurrent registrations both read the
same maximum, both try to write the same number, and one fails on the unique index at
random — a genuinely baffling bug to reproduce. `ON CONFLICT DO UPDATE` is atomic
because Postgres serialises it on the row's unique index.

Appointment, invoice and payment numbers are year-scoped (`code_counters_scoped`) so
each year starts at 1 and the printed number is sortable and readable. Pass the
document's own date, not the current time, or a backdated invoice gets numbered into
the wrong year.

These two tables are deliberately **absent** from the schema, so Prisma neither
generates a client for them nor tries to drop them as drift.

## Indexes

Every index is there for a query the application actually makes, named
`idx_<table>_<columns>`:

- `(healthcareCenterId, status)` on every tenant-scoped catalogue
- `(doctorId, startAt)` and `(patientId, startAt)` on appointments — the two things
  every dashboard and list queries
- `(patientId, visitDate)` and `(doctorId, visitDate)` on medical records
- `(healthcareCenterId, status, requestedAt)` on lab requests — the lab queue
- `(healthcareCenterId, status, paidAt)` on payments
- `(doctorId, status, createdAt)` on reviews — a doctor's published reviews
- `(userId, readAt, createdAt)` on notifications — the unread badge
- `(healthcareCenterId, createdAt)` on audit logs — the admin audit view

## Money

`Decimal(12,2)` everywhere. Never a float. The billing service writes
`subtotalAmount`, `discountAmount`, `taxAmount`, `totalAmount` and `dueAmount`
inside a transaction; they are read, never recomputed for display, and never taken
from a request body.

`Decimal` values are converted to `number` at the service boundary for charting and
display only. The authoritative arithmetic stays in Decimal.

A refund is a **new** `Payment` row rather than an edit, so the original receipt
stays accurate. `Invoice.dueAmount = totalAmount - paidAmount + refundedAmount` is
maintained server-side so outstanding balances can be filtered without aggregating
the payment table.

## Stock

`MedicineStock` holds per-batch quantity and expiry. There is deliberately **no**
`totalStock` column on `Medicine`: a cached total and the batches that should add up
to it would inevitably disagree. `StockMovement` is an append-only ledger recording
why each change happened, which is what makes a discrepancy auditable rather than
mysterious.

## Time

All `DateTime` columns are UTC. `startOfUtcDay`, `endOfUtcDay`, `startOfMonth` and
`monthWindow` in `src/services/_shared.ts` are the boundary helpers, and every
"today" range is built from them so a dashboard cannot disagree with itself about
which day it is.

## Migrations

```bash
npx prisma migrate dev --name what_changed   # development
npx prisma migrate deploy                    # production
npx prisma validate                          # schema sanity
```

`db seed` is idempotent and can be re-run. Appointments are matched on
`(doctorId, startAt)` rather than on the generated `appointmentNumber`, because the
number comes from a counter that advances on every call — matching on it would
re-insert every appointment and trip the overlap constraint.