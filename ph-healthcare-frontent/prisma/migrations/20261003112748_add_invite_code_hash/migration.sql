-- AlterTable
-- IF NOT EXISTS: this migration was retried after a partially-applied run, and
-- making it idempotent avoids a hard failure on a column that is already there.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "inviteCodeHash" TEXT;

-- NOTE: Prisma originally generated DROP TABLE statements for "code_counters" and
-- "code_counters_scoped" here, because those tables are created by hand in an
-- earlier migration and Prisma does not know them from schema.prisma, so it treats
-- them as drift. Those statements were removed: they are not a schema change this
-- migration is meant to make, and dropping the tables would destroy the
-- human-facing reference counters behind every code in the system.
--
-- The tables stay outside schema.prisma deliberately, so Prisma neither generates
-- a model for them nor tries to drop them. If they ever do need to change, write
-- that change as its own explicit migration.
