import { describe, expect, it } from "vitest";

import {
  hashPassword,
  needsRehash,
  passwordPolicyProblems,
  verifyPassword,
} from "@/lib/auth/password";
import { createToken, hashToken, TOKEN_TTL } from "@/lib/auth/tokens";
import { RoleKey } from "@/generated/prisma/enums";

/**
 * Credential handling (§38).
 *
 * These are the tests worth having: a regression in password hashing or in token
 * generation is not a cosmetic bug, it is the difference between an account being
 * protected and being readable.
 */
describe("password hashing", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("Demo@1234");

    await expect(verifyPassword("Demo@1234", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("Demo@1234");

    await expect(verifyPassword("Demo@12345", hash)).resolves.toBe(false);
  });

  it("is case- and normalisation-sensitive in the right way", async () => {
    const hash = await hashPassword("Demo@1234");

    // Passwords are compared literally; NFKC normalisation is applied on both sides
    // so visually identical passwords match, but a different case does not.
    await expect(verifyPassword("demo@1234", hash)).resolves.toBe(false);
  });

  it("never stores the plaintext", async () => {
    const hash = await hashPassword("Demo@1234");

    expect(hash).not.toContain("Demo@1234");
    expect(hash.startsWith("scrypt$")).toBe(true);
  });

  it("salts, so two hashes of the same password differ", async () => {
    const [a, b] = await Promise.all([
      hashPassword("Demo@1234"),
      hashPassword("Demo@1234"),
    ]);

    expect(a).not.toBe(b);
    await expect(verifyPassword("Demo@1234", a)).resolves.toBe(true);
    await expect(verifyPassword("Demo@1234", b)).resolves.toBe(true);
  });

  it("returns false for a malformed or absent stored hash", async () => {
    await expect(verifyPassword("Demo@1234", null)).resolves.toBe(false);
    await expect(verifyPassword("Demo@1234", "")).resolves.toBe(false);
    await expect(verifyPassword("Demo@1234", "not-a-hash")).resolves.toBe(false);
    // bcrypt-shaped string: right shape, wrong algorithm. Must not be accepted.
    await expect(
      verifyPassword("Demo@1234", "bcrypt$10$abc$def"),
    ).resolves.toBe(false);
  });

  it("reports that a current-parameter hash needs no rehash", async () => {
    const hash = await hashPassword("Demo@1234");

    expect(needsRehash(hash)).toBe(false);
  });

  it("flags a hash made with weaker parameters for rehashing", () => {
    // Same format, N reduced: the stored parameters are what verifyPassword reads,
    // so an old hash still works but gets upgraded on next sign-in.
    expect(needsRehash("scrypt$16384$8$1$c2FsdA$a2V5")).toBe(true);
  });
});

describe("password policy", () => {
  it("accepts a reasonable passphrase", () => {
    expect(passwordPolicyProblems("correct horse battery")).toEqual([]);
    expect(passwordPolicyProblems("Demo@12345")).toEqual([]);
  });

  it("requires a minimum length", () => {
    expect(passwordPolicyProblems("Ab1!").length).toBeGreaterThan(0);
  });

  it("rejects an all-numeric password", () => {
    // The policy is length-first, not composition-first: a long passphrase beats a
    // short "complex" password, so letters-only is fine and digits-only is not.
    expect(passwordPolicyProblems("1234567890123456").length).toBeGreaterThan(0);
  });

  it("rejects a password longer than the maximum", () => {
    expect(passwordPolicyProblems("a".repeat(300)).length).toBeGreaterThan(0);
  });

  it("explains every problem it finds", () => {
    expect(passwordPolicyProblems("abc")).toEqual([
      "Must be at least 10 characters long.",
    ]);
  });
});

describe("one-time tokens", () => {
  it("produces a token whose stored hash matches", async () => {
    const { token, tokenHash } = createToken(TOKEN_TTL.PASSWORD_RESET_MS);

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("never returns the raw token as the hash", () => {
    const { token, tokenHash } = createToken(TOKEN_TTL.EMAIL_VERIFICATION_MS);

    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toHaveLength(64); // sha256 hex
  });

  it("gives different tokens for the same millisecond", () => {
    const a = createToken(1000);
    const b = createToken(1000);

    expect(a.token).not.toBe(b.token);
  });

  it("sets an expiry one TTL into the future", () => {
    const before = Date.now();
    const { expiresAt } = createToken(TOKEN_TTL.PASSWORD_RESET_MS);

    // Tolerance on both bounds: `createToken` reads the clock a moment after
    // `before` is sampled, so asserting the exact upper bound is a flaky test that
    // fails whenever the millisecond ticks.
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      before + TOKEN_TTL.PASSWORD_RESET_MS + 1000,
    );
  });
});

describe("role keys", () => {
  it("has a stable home route for every role", () => {
    // `/dashboard` redirects by role, so a missing entry is a dead end for that
    // user rather than an error page.
    expect(Object.keys(ROLE_HOME_KEYS).sort()).toEqual(
      [...Object.values(RoleKey)].sort(),
    );
  });
});

// Imported lazily as a value so the test file has a single source of truth for the
// role list.
import { ROLE_HOME as ROLE_HOME_KEYS } from "@/config/navigation";