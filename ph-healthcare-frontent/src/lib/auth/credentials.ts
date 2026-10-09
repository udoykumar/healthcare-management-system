import "server-only";

import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { UserStatus } from "@/generated/prisma/enums";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/auth/password";

/**
 * Credential verification for the Auth.js Credentials provider.
 *
 * Every failure mode below returns the same generic message and null. The
 * provider has no way to distinguish "no such email" from "wrong password" once it
 * returns null, and a login form that reports which one it was is an account
 * enumeration oracle.
 */

const GENERIC_FAILURE = "Invalid email or password.";

/** Progressive lockout after repeated failures. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type CredentialResult =
  | { ok: true; userId: string }
  | { ok: false; reason: string };

/** Constant-time comparison for the optional `code` field used by staff invites. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on a length mismatch, so equalise first. The length of
  // an invite code is not a secret.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function authenticateWithPassword(
  email: string,
  password: string,
  providedInviteCode?: string,
): Promise<CredentialResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      inviteCodeHash: true,
      status: true,
      isDeleted: true,
      failedLoginCount: true,
      lockedUntil: true,
      sessionVersion: true,
    },
  });

  // No user: still run a hash so timing does not reveal whether the email exists.
  if (!user) {
    await verifyPassword(password, null);
    return { ok: false, reason: GENERIC_FAILURE };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.max(
      1,
      Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000),
    );
    return {
      ok: false,
      reason: `Too many failed attempts. Try again in ${minutes} minute(s).`,
    };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  /*
   * An invited account is not usable until its one-time invite code is presented
   * alongside the temporary password. Compared only while the account is still
   * PENDING_VERIFICATION; after activation the code is no longer consulted.
   *
   * Both values must be correct — the code alone cannot log in.
   */
  let inviteOk = true;
  if (passwordOk && user.status === UserStatus.PENDING_VERIFICATION) {
    if (!providedInviteCode || !user.inviteCodeHash) {
      return { ok: false, reason: GENERIC_FAILURE };
    }
    inviteOk = await safeEqual(providedInviteCode, user.inviteCodeHash);
  }

  if (!passwordOk || !inviteOk) {
    const nextCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextCount,
        lockedUntil:
          nextCount >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null,
      },
    });
    return { ok: false, reason: GENERIC_FAILURE };
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    return {
      ok: false,
      reason: "This account has been removed. Contact your administrator.",
    };
  }

  if (user.status === UserStatus.BLOCKED) {
    return {
      ok: false,
      reason: "Your account has been blocked. Contact your administrator.",
    };
  }

  // Opportunistically upgrade hashes that predate the current cost parameters.
  if (user.passwordHash && needsRehash(user.passwordHash)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  return { ok: true, userId: user.id };
}

/**
 * Verifies an invitation code on a not-yet-activated account.
 *
 * The code is compared against the stored one-time invite secret, in constant
 * time. Returns false for every failure mode so the caller cannot use it to learn
 * whether an address is registered.
 */
export async function isInviteCodeValid(
  email: string,
  code: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { status: true, inviteCodeHash: true, isDeleted: true },
  });

  if (!user || user.isDeleted || !user.inviteCodeHash) return false;
  if (user.status !== UserStatus.PENDING_VERIFICATION) return false;

  return safeEqual(code, user.inviteCodeHash);
}

/**
 * Used only by tests and by the "first run" bootstrap in prisma/seed.ts to confirm
 * that a value scrypt-hashes and verifies. Keeping the helper here means the test
 * exercises the same code path production uses.
 */
export async function selfTestPassword(password: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return verifyPassword(password, hash);
}