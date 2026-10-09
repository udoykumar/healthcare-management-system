import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * One-time tokens for email verification, password reset, and staff invitations.
 *
 * The raw token goes out by email and is never stored. Only its SHA-256 digest
 * lands in `verification_tokens`, so a leaked database cannot be replayed against
 * a live account, and an attacker with read access to the table still needs the
 * plaintext from the recipient's inbox.
 *
 * Comparison is done by looking the digest up in the database, so there is no
 * need for a timing-safe comparison here — the digest itself is the lookup key.
 */

export type RawToken = {
  /** The value to put in the email link. */
  token: string;
  /** What actually gets persisted. */
  tokenHash: string;
  expiresAt: Date;
};

/** 24 hours for verification, 1 hour for password reset. */
export const TOKEN_TTL = {
  EMAIL_VERIFICATION_MS: 24 * 60 * 60 * 1000,
  PASSWORD_RESET_MS: 60 * 60 * 1000,
  INVITATION_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken(ttlMs: number): RawToken {
  // 32 bytes of entropy: not guessable even if an attacker can trigger many
  // requests and observe latency.
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

export function buildVerificationUrl(
  appUrl: string,
  purpose: "verify-email" | "reset-password",
  token: string,
): string {
  const url = new URL(`/${purpose}`, appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}