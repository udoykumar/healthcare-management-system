import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// No `server-only` import here: this module is also loaded by prisma/seed.ts,
// which runs under tsx outside a React bundler, where that package deliberately
// throws. It is inherently server-side anyway — it requires a Prisma client as an
// argument, which cannot exist in a client bundle.

/**
 * Human-facing reference codes ("PT-000007", "INV-2026-000045").
 *
 * Why a counter table instead of `MAX(code) + 1`: the latter is a read-then-write
 * and is not atomic. Two concurrent registrations both read the same maximum and
 * both try to write the same number; one then fails on the unique index at random,
 * which is a genuinely baffling bug to reproduce. A single `INSERT ... ON CONFLICT
 * DO UPDATE` is atomic, because Postgres serialises it on the row's unique index.
 *
 * The counter tables (`code_counters`, `code_counters_scoped`) are created by
 * hand in prisma/migrations/20261003113000_code_counters and deliberately absent
 * from schema.prisma, so Prisma neither generates a model for them nor tries to
 * drop them as drift.
 *
 * The `value` column is read back under its real name. `RETURNING value` aliases
 * to the column's own name — asking for anything else yields undefined, which
 * makes every caller silently receive "…-000001" and collide on the second use.
 */

/** The minimal surface needed, so transactions work too. */
type CodeCounterClient = Pick<PrismaClient, "$queryRaw"> | Prisma.TransactionClient;

/** Unscoped series, e.g. "USR-000042". */
export async function nextCode(
  client: CodeCounterClient,
  prefix: string,
): Promise<string> {
  const rows = await client.$queryRaw<{ value: bigint }[]>`
    INSERT INTO code_counters ("prefix", value)
    VALUES (${prefix}, 1)
    ON CONFLICT ("prefix")
    DO UPDATE SET value = code_counters.value + 1
    RETURNING value
  `;

  return `${prefix}-${pad(Number(rows[0]?.value ?? 1))}`;
}

/**
 * Series scoped by year, e.g. "APT-2026-000123".
 *
 * Year-scoping means each year starts at 1, which is what makes the printed
 * document number sortable and readable to a human. `at` is the date the number
 * belongs to — pass the document's own date, not the current time, or a backdated
 * invoice would be numbered into the wrong year.
 */
export async function nextYearCode(
  client: CodeCounterClient,
  prefix: string,
  at: Date,
): Promise<string> {
  const scope = String(at.getUTCFullYear());

  const rows = await client.$queryRaw<{ value: bigint }[]>`
    INSERT INTO code_counters_scoped ("prefix", "scope", value)
    VALUES (${prefix}, ${scope}, 1)
    ON CONFLICT ("prefix", "scope")
    DO UPDATE SET value = code_counters_scoped.value + 1
    RETURNING value
  `;

  return `${prefix}-${scope}-${pad(Number(rows[0]?.value ?? 1))}`;
}

function pad(value: number): string {
  return String(value).padStart(6, "0");
}

/** The counter namespaces the application uses. */
export const CODE_PREFIX = {
  USER: "USR",
  PATIENT: "PT",
  DOCTOR: "DOC",
  STAFF: "STF",
  DEPARTMENT: "DEP",
  SCHEDULE: "SCH",
  LEAVE: "LV",
  APPOINTMENT: "APT",
  MEDICAL_RECORD: "REC",
  VITAL: "VIT",
  DIAGNOSIS: "DIA",
  PRESCRIPTION: "RX",
  PRESCRIPTION_ITEM: "RXI",
  MEDICINE: "MED",
  STOCK: "STK",
  MOVEMENT: "MOV",
  LAB_CATEGORY: "LBC",
  LAB_TEST: "LAB",
  LAB_PARAMETER: "PRM",
  LAB_REQUEST: "LREQ",
  LAB_REQUEST_ITEM: "LRI",
  LAB_RESULT: "LRS",
  LAB_RESULT_VALUE: "LRV",
  SERVICE: "SRV",
  INVOICE: "INV",
  INVOICE_ITEM: "INI",
  PAYMENT: "PAY",
  NOTIFICATION: "NTF",
  REVIEW: "REV",
  DOCUMENT: "DOC",
} as const;