import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { env, isDevelopment } from "@/lib/env";

/**
 * Email transport (§47).
 *
 * This module knows about SMTP and nothing else. Business code calls the typed
 * functions in `src/lib/email/templates.ts`, so swapping SMTP for SES, Resend or
 * SES-via-API is a change to this file alone and no call site has to know.
 *
 * Development behaviour: when `EMAIL_SERVER` is unset the mail is logged instead
 * of sent. That keeps local development usable without credentials while making
 * it obvious that nothing was actually delivered — a silent no-op would be worse,
 * because a developer would test the flow and assume the mail left the machine.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.EMAIL_SERVER) return null;

  if (!transporter) {
    // Format: smtps://user:password@smtp.example.com:465
    const url = new URL(env.EMAIL_SERVER);
    const secure = url.protocol === "smtps:" || url.port === "465";

    transporter = nodemailer.createTransport({
      host: url.hostname,
      port: url.port ? Number(url.port) : secure ? 465 : 587,
      secure,
      auth:
        url.username || url.password
          ? {
              user: decodeURIComponent(url.username),
              pass: decodeURIComponent(url.password),
            }
          : undefined,
    });
  }

  return transporter;
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailResult = { delivered: boolean; error?: string };

/**
 * Sends one message. Never throws — a failed email must not roll back the
 * business action that triggered it. Callers get a result and decide whether the
 * failure matters (a verification link does; a reminder does not).
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const transport = getTransporter();

  if (!transport) {
    if (isDevelopment) {
      console.info(
        [
          "",
          "──────────── EMAIL (not sent: EMAIL_SERVER is not configured) ────────────",
          `To:      ${message.to}`,
          `From:    ${env.EMAIL_FROM}`,
          `Subject: ${message.subject}`,
          "",
          message.text,
          "─────────────────────────────────────────────────────────────────────────",
          "",
        ].join("\n"),
      );
      return { delivered: false, error: "EMAIL_SERVER_NOT_CONFIGURED" };
    }

    // In production, a missing server config is an operator error worth surfacing.
    console.error("[email] EMAIL_SERVER is not configured; message not sent.");
    return { delivered: false, error: "EMAIL_SERVER_NOT_CONFIGURED" };
  }

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[email] send failed:", error instanceof Error ? error.message : error);
    return {
      delivered: false,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}

/** True when a real transport is configured. Used by tests and diagnostics. */
export function isEmailConfigured(): boolean {
  return Boolean(env.EMAIL_SERVER);
}