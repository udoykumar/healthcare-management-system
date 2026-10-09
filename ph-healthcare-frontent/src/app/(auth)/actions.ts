"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuditAction, RoleKey, UserStatus } from "@/generated/prisma/enums";

import { auth, signIn, signOut } from "@/auth";
import { AppError } from "@/lib/api/errors";
import { audit } from "@/lib/audit/log";
import { clientIp, LIMITS, enforceRateLimit } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { hashPassword, passwordPolicyProblems } from "@/lib/auth/password";
import {
  createToken,
  hashToken,
  buildVerificationUrl,
  TOKEN_TTL,
} from "@/lib/auth/tokens";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { validate } from "@/lib/api/validate";
import type { ActionState } from "@/lib/auth/action-state";
import { nextCode, CODE_PREFIX } from "@/lib/db/code-counter";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/shared";

/**
 * Authentication server actions.
 *
 * Server actions rather than route handlers because they are only ever called
 * from our own UI: Next.js checks the Origin/Host pair before invoking them, which
 * gives CSRF protection without a token. They are still plain HTTP POSTs, so the
 * same validation, rate limiting and audit logging apply as to any API.
 */

/** Turns a thrown AppError into per-field messages the form can render. */
function toFieldErrors(error: unknown): ActionState {
  if (error instanceof AppError) {
    const details = error.details as
      | { path: string; message: string }[]
      | undefined;

    if (Array.isArray(details)) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of details) fieldErrors[issue.path] = issue.message;
      return { status: "error", message: error.message, fieldErrors };
    }

    return { status: "error", message: error.message };
  }

  console.error("[auth] unexpected error:", error);
  return {
    status: "error",
    message: "Something went wrong. Please try again.",
  };
}

async function requestMeta() {
  const headerList = await headers();
  return {
    ipAddress: clientIp(new Request("http://local", { headers: headerList })),
    userAgent: headerList.get("user-agent"),
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Self-registration is patient-only.
 *
 * Doctors, admins and superadmins are created by an administrator and receive an
 * invitation; letting anyone pick their role at signup would be a trivial
 * privilege-escalation hole. The role is hardcoded here rather than read from the
 * payload, which is exactly why spreading a request body into a Prisma `create`
 * is forbidden.
 */
export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const meta = await requestMeta();
    enforceRateLimit(`register:${meta.ipAddress}`, LIMITS.register.limit, LIMITS.register.windowMs);

    const raw = Object.fromEntries(formData.entries());
    const input = await validate(registerSchema, {
      ...raw,
      acceptTerms: raw.acceptTerms === "true" || raw.acceptTerms === "on",
    });

    const policyProblems = passwordPolicyProblems(input.password);
    if (policyProblems.length > 0) {
      throw AppError.unprocessable(policyProblems.join(" "), [
        { path: "password", message: policyProblems.join(" ") },
      ]);
    }

    const center = await prisma.healthcareCenter.findUnique({
      where: { id: input.healthcareCenterId },
      select: { id: true, name: true, status: true },
    });

    if (!center || center.status !== UserStatus.ACTIVE) {
      // Do not reveal whether the id exists.
      throw AppError.notFound("That healthcare center is not accepting registrations.");
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw AppError.conflict(
        "An account with that email already exists.",
        "EMAIL_TAKEN",
      );
    }

    const passwordHash = await hashPassword(input.password);
    const token = createToken(TOKEN_TTL.EMAIL_VERIFICATION_MS);

    const user = await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({
        where: { key: RoleKey.PATIENT },
        select: { id: true },
      });

      const created = await tx.user.create({
        data: {
          code: await nextCode(tx, CODE_PREFIX.USER),
          name: `${input.firstName} ${input.lastName}`.trim(),
          email: input.email,
          phone: input.phone,
          passwordHash,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerified: null,
          roleId: role.id,
          healthcareCenterId: center.id,
          patient: {
            create: {
              code: await nextCode(tx, CODE_PREFIX.PATIENT),
              firstName: input.firstName,
              lastName: input.lastName,
              dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
              gender: input.gender,
              email: input.email,
              phone: input.phone,
              healthcareCenterId: center.id,
            },
          },
        },
        select: { id: true, email: true },
      });

      await tx.verificationToken.create({
        data: {
          tokenHash: token.tokenHash,
          email: created.email as string,
          purpose: "EMAIL_VERIFICATION",
          expiresAt: token.expiresAt,
        },
      });

      return created;
    });

    // Verification mail is best-effort: a failed send must not lose the account.
    // The user can request a new link from the login screen.
    await sendVerificationEmail({
      to: user.email as string,
      name: input.firstName,
      verificationUrl: buildVerificationUrl(
        env.NEXT_PUBLIC_APP_URL,
        "verify-email",
        token.token,
      ),
    });

    await audit({
      action: AuditAction.USER_CREATED,
      userId: user.id,
      userEmail: user.email,
      userRole: RoleKey.PATIENT,
      healthcareCenterId: center.id,
      entity: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { selfRegistered: true, centerName: center.name },
    });

    return {
      status: "success",
      message:
        "Account created. Check your email for a verification link, then sign in.",
    };
  } catch (error) {
    return toFieldErrors(error);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let meta: { ipAddress: string; userAgent: string | null } = {
    ipAddress: "unknown",
    userAgent: null,
  };

  try {
    meta = await requestMeta();
    const raw = Object.fromEntries(formData.entries());
    const input = await validate(loginSchema, raw);

    enforceRateLimit(`login:${meta.ipAddress}`, LIMITS.login.limit, LIMITS.login.windowMs);
    // Also limit per account, so one attacker cannot lock a real patient out by
    // grinding their address from many IPs.
    enforceRateLimit(
      `login:account:${input.email}`,
      LIMITS.login.limit,
      LIMITS.login.windowMs,
    );

    // redirect: false so a failure returns here instead of throwing.
    const result = await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    if (result?.error) {
      await audit({
        action: AuditAction.LOGIN_FAILED,
        userEmail: input.email,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        succeeded: false,
        reason: "invalid_credentials",
      });

      return {
        status: "error",
        message: "Invalid email or password.",
      };
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (userId) {
      await audit({
        action: AuditAction.LOGIN,
        userId,
        userEmail: input.email,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    // Bounce the browser on. `redirect` throws a control-flow signal, so it has to
    // be outside the try block below.
  } catch (error) {
    return toFieldErrors(error);
  }

  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  redirect(callbackUrl);
}

export async function logoutAction() {
  const session = await auth();

  if (session?.user?.id) {
    await audit({
      action: AuditAction.LOGOUT,
      userId: session.user.id,
      ipAddress: (await requestMeta()).ipAddress,
    });
  }

  await signOut({ redirectTo: "/login" });
}

/**
 * Only same-origin relative paths are honoured.
 *
 * Without this check a crafted `?callbackUrl=https://evil.example` would turn a
 * successful login into an open redirect that carries the user off-site while
 * still believing they signed in.
 */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const raw = Object.fromEntries(formData.entries());
    const input = await validate(forgotPasswordSchema, raw);

    enforceRateLimit(
      `reset:${input.email}`,
      LIMITS.passwordReset.limit,
      LIMITS.passwordReset.windowMs,
    );

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, name: true, status: true, isDeleted: true },
    });

    // The response is identical whether or not the address exists, so this screen
    // cannot be used to discover which patients are registered.
    if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
      return {
        status: "success",
        message:
          "If that email is registered, a password reset link is on its way.",
      };
    }

    const token = createToken(TOKEN_TTL.PASSWORD_RESET_MS);

    await prisma.verificationToken.create({
      data: {
        tokenHash: token.tokenHash,
        email: user.email as string,
        purpose: "PASSWORD_RESET",
        expiresAt: token.expiresAt,
      },
    });

    await sendPasswordResetEmail({
      to: user.email as string,
      name: user.name,
      resetUrl: buildVerificationUrl(
        env.NEXT_PUBLIC_APP_URL,
        "reset-password",
        token.token,
      ),
    });

    await audit({
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      userEmail: user.email,
      metadata: { delivered: true },
    });

    return {
      status: "success",
      message:
        "If that email is registered, a password reset link is on its way.",
    };
  } catch (error) {
    return toFieldErrors(error);
  }
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const raw = Object.fromEntries(formData.entries());
    const input = await validate(resetPasswordSchema, raw);

    const policyProblems = passwordPolicyProblems(input.password);
    if (policyProblems.length > 0) {
      throw AppError.unprocessable(policyProblems.join(" "), [
        { path: "password", message: policyProblems.join(" ") },
      ]);
    }

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
      select: { id: true, email: true, purpose: true, expiresAt: true, usedAt: true },
    });

    if (
      !record ||
      record.purpose !== "PASSWORD_RESET" ||
      record.usedAt !== null ||
      record.expiresAt < new Date()
    ) {
      throw AppError.badRequestLink();
    }

    const user = await prisma.user.findUnique({
      where: { email: record.email },
      select: { id: true, status: true, isDeleted: true },
    });

    if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
      throw AppError.badRequestLink();
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
          // Invalidate existing sessions: the old password may have been
          // compromised, which is the entire reason someone is resetting it.
          sessionVersion: { increment: 1 },
        },
      });

      await tx.passwordHistory.create({ data: { userId: user.id, passwordHash } });

      // Single-use: burn the token.
      await tx.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      // Supersede any other outstanding reset links for this address.
      await tx.verificationToken.deleteMany({
        where: { email: record.email, purpose: "PASSWORD_RESET", usedAt: null },
      });
    });

    await audit({
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      userId: user.id,
      userEmail: record.email,
    });

    return {
      status: "success",
      message: "Your password has been reset. You can sign in now.",
    };
  } catch (error) {
    return toFieldErrors(error);
  }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) throw AppError.unauthorized();

    const raw = Object.fromEntries(formData.entries());
    const input = await validate(changePasswordSchema, raw);

    const policyProblems = passwordPolicyProblems(input.password);
    if (policyProblems.length > 0) {
      throw AppError.unprocessable(policyProblems.join(" "), [
        { path: "password", message: policyProblems.join(" ") },
      ]);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) throw AppError.unauthorized();

    const { verifyPassword } = await import("@/lib/auth/password");
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw AppError.unprocessable("Your current password is incorrect.", [
        { path: "currentPassword", message: "Incorrect password." },
      ]);
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.passwordHistory.create({ data: { userId, passwordHash } });
    });

    await audit({
      action: AuditAction.PASSWORD_CHANGED,
      userId,
      entity: "User",
      entityId: userId,
    });

    return { status: "success", message: "Password updated." };
  } catch (error) {
    return toFieldErrors(error);
  }
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function verifyEmailAction(token: string): Promise<ActionState> {
  try {
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, email: true, purpose: true, expiresAt: true, usedAt: true },
    });

    if (
      !record ||
      record.purpose !== "EMAIL_VERIFICATION" ||
      record.usedAt !== null ||
      record.expiresAt < new Date()
    ) {
      throw AppError.badRequestLink();
    }

    const user = await prisma.user.findUnique({
      where: { email: record.email },
      select: { id: true, emailVerified: true, status: true },
    });

    if (!user) throw AppError.badRequestLink();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: user.emailVerified ?? new Date(),
          // First verification activates the account; it stays PENDING
          // otherwise, which is what makes the address actually meaningful.
          status: UserStatus.ACTIVE,
        },
      });

      await tx.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
    });

    await audit({
      action: AuditAction.EMAIL_VERIFIED,
      userId: user.id,
      userEmail: record.email,
    });

    return { status: "success", message: "Email verified. You can sign in now." };
  } catch (error) {
    return toFieldErrors(error);
  }
}

export async function resendVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const raw = Object.fromEntries(formData.entries());
    const input = await validate(forgotPasswordSchema, raw);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      return {
        status: "success",
        message: "If that account still needs verification, a new link is on its way.",
      };
    }

    const token = createToken(TOKEN_TTL.EMAIL_VERIFICATION_MS);

    await prisma.verificationToken.create({
      data: {
        tokenHash: token.tokenHash,
        email: user.email as string,
        purpose: "EMAIL_VERIFICATION",
        expiresAt: token.expiresAt,
      },
    });

    await sendVerificationEmail({
      to: user.email as string,
      name: user.name,
      verificationUrl: buildVerificationUrl(
        env.NEXT_PUBLIC_APP_URL,
        "verify-email",
        token.token,
      ),
    });

    return {
      status: "success",
      message: "If that account still needs verification, a new link is on its way.",
    };
  } catch (error) {
    return toFieldErrors(error);
  }
}
