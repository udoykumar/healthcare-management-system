import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Prisma client is generated (~114k lines) and is not ours to lint.
    // Linting it produces noise and slows every run to a crawl.
    "src/generated/**",
    // Local tooling, not application code.
    "scripts/**",
  ]),
]);

export default eslintConfig;
