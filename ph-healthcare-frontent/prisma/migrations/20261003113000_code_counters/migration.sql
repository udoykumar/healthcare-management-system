-- Sequential counters behind the human-facing reference codes ("PT-000007",
-- "APT-2026-000123"). Kept in the database rather than computed as MAX(code)+1
-- in application code: the read-then-write of a MAX() is not atomic, so two
-- concurrent registrations can derive the same number and one of them then fails
-- on the unique index. Locking the counter row serialises it.
--
-- These tables are not represented in schema.prisma, so Prisma will neither
-- generate a client model for them nor try to drop them. The one raw query that
-- touches this table lives in src/app/(auth)/actions.ts.

CREATE TABLE IF NOT EXISTS "code_counters" (
  "prefix" TEXT PRIMARY KEY,
  "value"  BIGINT NOT NULL DEFAULT 0
);

-- Appointment and invoice numbers are year-scoped ("APT-2026-000123"), so the
-- counter needs a second, per-year series.
CREATE TABLE IF NOT EXISTS "code_counters_scoped" (
  "prefix" TEXT NOT NULL,
  "scope"  TEXT NOT NULL,
  "value"  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY ("prefix", "scope")
);
