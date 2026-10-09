import { z } from "zod";

/**
 * Validated environment access.
 *
 * Every `process.env` read in application code goes through this module. Parsing
 * once at import time turns a missing or malformed variable into a loud failure
 * at boot instead of an `undefined` that surfaces much later as a confusing
 * runtime error — the failure mode the previous backend had, where an unset
 * `JWT_SECRET` only blew up on the first login.
 *
 * Server-only: it reads secrets, so nothing under `lib/env` may be imported from
 * a Client Component. Use `lib/env-public.ts` for `NEXT_PUBLIC_*` values.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    }),

  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),

  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: z
    .union([z.literal("true"), z.literal("false")])
    .optional(),

  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),

  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().default("no-reply@ph-healthcare.local"),

  STORAGE_URL: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default("ph-healthcare-documents"),

  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  ENABLE_REMINDER_JOBS: z
    .union([z.literal("true"), z.literal("false")])
    .default("false"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function parseEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${details}\n\n` +
        "Copy .env.example to .env and fill in the missing values.",
    );
  }

  return parsed.data;
}

export const env: ServerEnv = parseEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

/** Origins permitted to call the REST API with credentials. */
export const allowedOrigins: string[] = env.ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const reminderJobsEnabled = env.ENABLE_REMINDER_JOBS === "true";