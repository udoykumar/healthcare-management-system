import "server-only";

import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing.
 *
 * Uses scrypt from node:crypto rather than bcrypt. scrypt is memory-hard and
 * ships in Node's standard library, so there is no native build step and no
 * third-party crypto in the trust path. Parameters follow RFC 9106 guidance
 * (N=2^15, r=8, p=1) and are stored inside the hash so they can be raised later
 * without invalidating existing passwords: `verifyPassword` re-reads the cost
 * from the stored string and transparently accepts older, weaker hashes.
 *
 * Format: `scrypt$N$r$p$<salt base64url>$<derived key base64url>`
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 32768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
// scrypt needs roughly 128 * N * r bytes; give it headroom over the 32MB default.
const MAX_MEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) {
    // Still burn a hash so a missing account and a wrong password take the same
    // time — otherwise response latency enumerates registered emails.
    await hashPassword(password);
    return false;
  }

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4] ?? "", "base64url");
    expected = Buffer.from(parts[5] ?? "", "base64url");
  } catch {
    return false;
  }

  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEM,
    });
  } catch {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

/**
 * True when a stored hash was made with weaker parameters than the current ones,
 * signalling that it should be re-hashed on the user's next successful login.
 */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt") return true;
  return Number(parts[1]) < PARAMS.N;
}

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

/**
 * Password policy, enforced server-side. Deliberately length-first rather than
 * composition-first: long passphrases beat short "complex" passwords, and forcing
 * symbol classes mostly produces `Password1!`.
 *
 * Returns a list of human-readable problems; empty means acceptable.
 */
export function passwordPolicyProblems(password: string): string[] {
  const problems: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`Must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    problems.push(`Must be at most ${PASSWORD_MAX_LENGTH} characters long.`);
  }
  if (/^\d+$/.test(password)) {
    problems.push("Cannot be entirely numeric.");
  }

  return problems;
}