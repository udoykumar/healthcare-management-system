/**
 * Stub for the `server-only` package.
 *
 * `server-only` throws when a module that imports it ends up in a client bundle.
 * That is the behaviour we want in a Next build and the opposite of what we want
 * under Vitest, which imports server modules directly on purpose. Replacing it with
 * an empty module lets the real implementation be tested.
 *
 * Kept as a real file rather than an inline alias so the replacement is obvious
 * when a test starts failing for an unrelated reason.
 */
export {};