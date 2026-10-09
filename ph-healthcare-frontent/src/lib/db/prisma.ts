import { PrismaPg } from "@prisma/adapter-pg";

import { env, isDevelopment } from "@/lib/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * The single shared PrismaClient.
 *
 * Import `prisma` from here rather than constructing one. In development `next
 * dev` hot-reloads modules, and each reload would otherwise open a fresh
 * connection pool and eventually exhaust Postgres' connection limit.
 *
 * Prisma 7 reaches Postgres through a driver adapter, so `pg` owns the pool. Note
 * this app uses its own *database* (`ph_healthcare`), not just its own schema,
 * rather than a `schema=` parameter: Prisma 7's query interpreter qualifies every
 * table with `public`, so a non-default schema is not honoured at runtime. A
 * dedicated database is also stricter isolation than a schema — see
 * docs/database.md.
 */
export function createPrismaClient(connectionString = env.DATABASE_URL) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma: ReturnType<typeof createPrismaClient> =
  globalForPrisma.prisma ?? createPrismaClient();

if (!isDevelopment) {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
