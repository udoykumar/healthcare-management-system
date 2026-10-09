-- Guards the two scheduling invariants that an application-level check alone
-- cannot guarantee: two concurrent booking requests can both pass a read before
-- either writes, because READ COMMITTED does not serialise them.
--
-- 1. A doctor cannot hold two appointments whose time ranges overlap.
-- 2. An appointment must end after it starts.
--
-- The exclusion constraint is PARTIAL: cancelled / no-show / superseded rows no
-- longer reserve the slot, so cancelling an appointment frees the time. '[)' means
-- back-to-back appointments (10:00-10:20 and 10:20-10:40) are allowed.
--
-- btree_gist is required to combine an equality operator (=) with the range
-- overlap operator (&&) in a single GiST index.
--
-- tsrange, not tstzrange: Prisma maps DateTime to TIMESTAMP(3) without a time
-- zone, and tstzrange depends on the session TimeZone, which Postgres therefore
-- refuses to index. Every DateTime in this database is stored as UTC — see
-- docs/architecture.md.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_end_after_start"
  CHECK ("endAt" > "startAt");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_doctor_no_overlap"
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW', 'RESCHEDULED'));

ALTER TABLE "doctor_leaves"
  ADD CONSTRAINT "doctor_leaves_end_after_start"
  CHECK ("endDate" >= "startDate");

-- A lab result value is either numeric or qualitative, never neither on a
-- parameter that is marked quantitative, and never both.
ALTER TABLE "lab_result_values"
  ADD CONSTRAINT "lab_result_value_has_a_reading"
  CHECK ("resultValue" IS NOT NULL OR "resultText" IS NOT NULL);

-- Invoice money must not go negative on the lines.
ALTER TABLE "invoice_items"
  ADD CONSTRAINT "invoice_item_totals_non_negative"
  CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" >= 0);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoice_amounts_non_negative"
  CHECK ("totalAmount" >= 0 AND "paidAmount" >= 0 AND "discountAmount" >= 0 AND "taxAmount" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payment_amounts_sane"
  CHECK ("amount" > 0 AND "refundedAmount" >= 0 AND "refundedAmount" <= "amount");

ALTER TABLE "reviews"
  ADD CONSTRAINT "review_rating_range"
  CHECK ("rating" BETWEEN 1 AND 5);

-- Stock balances cannot go negative; the movement ledger records why.
ALTER TABLE "medicine_stock"
  ADD CONSTRAINT "medicine_stock_quantity_non_negative"
  CHECK ("quantity" >= 0);

ALTER TABLE "doctor_schedules"
  ADD CONSTRAINT "doctor_schedule_times_valid"
  CHECK ("endTime" > "startTime");
