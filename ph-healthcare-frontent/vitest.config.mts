import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";


/**
 * Vitest configuration.
 *
 * Two environments, because the codebase has two kinds of unit:
 *
 *  - `node` for the pure server logic — password hashing, validation schemas,
 *    tenant scoping, formatting. These are where the business rules live (§58) and
 *    where a regression actually costs something.
 *  - `happy-dom` for the couple of component-level assertions on the pure helpers
 *    in `components/`.
 *
 * `src/generated/**` and `.next/**` are excluded from coverage: the Prisma client
 * is ~114k generated lines, and counting it would make the number meaningless.
 *
 * `server-only` is stubbed because the modules under test import it. It throws by
 * design in a client bundle; under Vitest it is a no-op marker, so aliasing it to an
 * empty module lets the real implementation be imported and tested.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    globals: false,
    reporters: process.env.CI ? ["default"] : ["default"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: [
        "src/lib/**/*.ts",
        "src/services/**/*.ts",
        "src/config/**/*.ts",
      ],
      exclude: [
        "src/generated/**",
        "src/lib/env.ts",
        "src/lib/db/prisma.ts",
        "src/lib/email/**",
      ],
    },
  },
});