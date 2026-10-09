import "server-only";

import { sendEmail } from "@/lib/email/transporter";

/**
 * Typed email templates (§47).
 *
 * Templates are plain functions returning subject/html/text, with no knowledge of
 * Prisma or of the domain model — they take already-resolved strings. That keeps
 * them trivially unit-testable and means a template change cannot leak a database
 * query into an email.
 *
 * Layout is inline CSS because mail clients strip <style> and ignore external
 * stylesheets; a single `.container` rule set has to be repeated inline per
 * element.
 */

const BRAND = {
  name: "PH Healthcare",
  // Kept deliberately plain; a production deployment overrides this in the layout.
  accent: "#0d9488",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#f8fafc",
};

function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
            <tr>
              <td style="background:${BRAND.accent};padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:600;">${BRAND.name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:${BRAND.ink};font-size:15px;line-height:1.6;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:${BRAND.surface};border-top:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;line-height:1.5;">
                <p style="margin:0 0 6px;">This is an automated message. Please do not reply to it.</p>
                <p style="margin:0;">If you did not request this, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
  </p>
  <p style="margin:0;color:${BRAND.muted};font-size:13px;">If the button does not work, copy this link into your browser:<br>
    <span style="word-break:break-all;">${href}</span>
  </p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verificationUrl: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "Verify your email address",
    html: shell(
      "Verify your email address",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(params.name)},</p>
       <p style="margin:0 0 16px;">Confirm this email address to activate your ${escapeHtml(BRAND.name)} account. You will need to verify your address before you can access medical records.</p>
       ${button(params.verificationUrl, "Verify my email")}
       <p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;">This link expires in 24 hours.</p>`,
    ),
    text: `Hello ${params.name},\n\nVerify your email address to activate your ${BRAND.name} account:\n${params.verificationUrl}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "Reset your password",
    html: shell(
      "Reset your password",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(params.name)},</p>
       <p style="margin:0 0 16px;">We received a request to reset your password. Choose a new one using the link below.</p>
       ${button(params.resetUrl, "Choose a new password")}
       <p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;">This link expires in 1 hour. If you did not request a reset, no action is needed — your password has not changed.</p>`,
    ),
    text: `Hello ${params.name},\n\nReset your password here:\n${params.resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
  setPasswordUrl: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "Your account has been created",
    html: shell(
      "Your account is ready",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(params.name)},</p>
       <p style="margin:0 0 16px;">An administrator has created your ${escapeHtml(BRAND.name)} account. Sign in with the temporary password below, then choose your own.</p>
       <p style="margin:0 0 8px;color:${BRAND.muted};font-size:13px;">Temporary password</p>
       <p style="margin:0 0 20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:6px;padding:10px 14px;display:inline-block;">${escapeHtml(params.temporaryPassword)}</p>
       ${button(params.setPasswordUrl, "Sign in and set a password")}
       <p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;">You will be asked to change this password before you can continue.</p>`,
    ),
    text: `Hello ${params.name},\n\nYour ${BRAND.name} account has been created.\nTemporary password: ${params.temporaryPassword}\n\nSign in and set a password: ${params.setPasswordUrl}`,
  });
}

export type AppointmentEmailData = {
  patientName: string;
  doctorName: string;
  centerName: string;
  startAtLabel: string;
  appointmentType: string;
  reason?: string | null;
};

function appointmentRows(data: AppointmentEmailData): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;border:1px solid ${BRAND.border};border-radius:8px;">
    <tr><td style="padding:10px 14px;color:${BRAND.muted};width:40%;">Doctor</td><td style="padding:10px 14px;font-weight:600;">${escapeHtml(data.doctorName)}</td></tr>
    <tr style="background:${BRAND.surface};"><td style="padding:10px 14px;color:${BRAND.muted};">Date &amp; time</td><td style="padding:10px 14px;font-weight:600;">${escapeHtml(data.startAtLabel)}</td></tr>
    <tr><td style="padding:10px 14px;color:${BRAND.muted};">Center</td><td style="padding:10px 14px;">${escapeHtml(data.centerName)}</td></tr>
    <tr style="background:${BRAND.surface};"><td style="padding:10px 14px;color:${BRAND.muted};">Type</td><td style="padding:10px 14px;">${escapeHtml(data.appointmentType)}</td></tr>
  </table>`;
}

export async function sendAppointmentConfirmationEmail(
  to: string,
  data: AppointmentEmailData,
): Promise<void> {
  await sendEmail({
    to,
    subject: `Appointment confirmed — ${data.startAtLabel}`,
    html: shell(
      "Your appointment is confirmed",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(data.patientName)},</p>
       ${appointmentRows(data)}
       <p style="margin:16px 0 0;color:${BRAND.muted};font-size:13px;">Please arrive 10 minutes early. Bring a photo ID and any relevant previous records.</p>`,
    ),
    text: `Hello ${data.patientName},\n\nYour appointment is confirmed.\nDoctor: ${data.doctorName}\nDate: ${data.startAtLabel}\nCenter: ${data.centerName}\nType: ${data.appointmentType}`,
  });
}

export async function sendAppointmentReminderEmail(
  to: string,
  data: AppointmentEmailData & { hoursBefore: number },
): Promise<void> {
  await sendEmail({
    to,
    subject: `Reminder: appointment in ${data.hoursBefore} hour${data.hoursBefore === 1 ? "" : "s"}`,
    html: shell(
      `Appointment reminder — in ${data.hoursBefore} hour${data.hoursBefore === 1 ? "" : "s"}`,
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(data.patientName)}, this is a reminder of your upcoming appointment.</p>
       ${appointmentRows(data)}`,
    ),
    text: `Hello ${data.patientName},\n\nReminder: your appointment with ${data.doctorName} is at ${data.startAtLabel}.`,
  });
}

export async function sendAppointmentCancellationEmail(
  to: string,
  data: AppointmentEmailData & { reason?: string | null },
): Promise<void> {
  await sendEmail({
    to,
    subject: "Your appointment has been cancelled",
    html: shell(
      "Appointment cancelled",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(data.patientName)},</p>
       <p style="margin:0 0 16px;">The appointment below has been cancelled.</p>
       ${appointmentRows(data)}
       ${data.reason ? `<p style="margin:16px 0 0;color:${BRAND.muted};font-size:14px;">Reason: ${escapeHtml(data.reason)}</p>` : ""}
       <p style="margin:24px 0 0;">You can book another appointment at any time.</p>`,
    ),
    text: `Hello ${data.patientName},\n\nYour appointment with ${data.doctorName} on ${data.startAtLabel} has been cancelled.${data.reason ? `\nReason: ${data.reason}` : ""}`,
  });
}

export async function sendLabReportAvailableEmail(
  to: string,
  params: { patientName: string; testNames: string[]; reportUrl: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: "Your lab report is ready",
    html: shell(
      "Lab report available",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(params.patientName)},</p>
       <p style="margin:0 0 16px;">The following report${params.testNames.length === 1 ? " is" : "s are"} ready to view:</p>
       <ul style="margin:0 0 16px;padding-left:20px;">${params.testNames.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
       ${button(params.reportUrl, "View my report")}
       <p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;">Please discuss the results with your treating doctor. This notification is not a clinical interpretation.</p>`,
    ),
    text: `Hello ${params.patientName},\n\nYour lab report is ready: ${params.testNames.join(", ")}\n\nView it here: ${params.reportUrl}\n\nPlease discuss the results with your treating doctor.`,
  });
}

export async function sendPrescriptionAvailableEmail(
  to: string,
  params: { patientName: string; doctorName: string; downloadUrl: string },
): Promise<void> {
  await sendEmail({
    to,
    subject: "Your prescription is ready",
    html: shell(
      "Prescription available",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(params.patientName)},</p>
       <p style="margin:0 0 16px;">${escapeHtml(params.doctorName)} has issued a prescription for you.</p>
       ${button(params.downloadUrl, "View prescription")}
       <p style="margin:24px 0 0;color:${BRAND.muted};font-size:13px;">Follow the dosage exactly as written. Contact your doctor if you have any questions or side effects.</p>`,
    ),
    text: `Hello ${params.patientName},\n\n${params.doctorName} has issued a prescription for you.\n\nView it here: ${params.downloadUrl}`,
  });
}

export async function sendPaymentReceiptEmail(
  to: string,
  params: {
    patientName: string;
    invoiceNumber: string;
    amountLabel: string;
    paidAtLabel: string;
    method: string;
    balanceLabel: string;
  },
): Promise<void> {
  await sendEmail({
    to,
    subject: `Payment received — ${params.invoiceNumber}`,
    html: shell(
      "Payment received",
      `<p style="margin:0 0 16px;">Hello ${escapeHtml(params.patientName)},</p>
       <p style="margin:0 0 16px;">We have received your payment. Here is the summary:</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid ${BRAND.border};border-radius:8px;">
         <tr><td style="padding:10px 14px;color:${BRAND.muted};">Invoice</td><td style="padding:10px 14px;font-weight:600;">${escapeHtml(params.invoiceNumber)}</td></tr>
         <tr style="background:${BRAND.surface};"><td style="padding:10px 14px;color:${BRAND.muted};">Amount paid</td><td style="padding:10px 14px;font-weight:600;">${escapeHtml(params.amountLabel)}</td></tr>
         <tr><td style="padding:10px 14px;color:${BRAND.muted};">Method</td><td style="padding:10px 14px;">${escapeHtml(params.method)}</td></tr>
         <tr style="background:${BRAND.surface};"><td style="padding:10px 14px;color:${BRAND.muted};">Paid on</td><td style="padding:10px 14px;">${escapeHtml(params.paidAtLabel)}</td></tr>
         <tr><td style="padding:10px 14px;color:${BRAND.muted};">Balance due</td><td style="padding:10px 14px;font-weight:600;">${escapeHtml(params.balanceLabel)}</td></tr>
       </table>`,
    ),
    text: `Hello ${params.patientName},\n\nPayment received.\nInvoice: ${params.invoiceNumber}\nAmount: ${params.amountLabel}\nMethod: ${params.method}\nBalance due: ${params.balanceLabel}\n\nThank you.`,
  });
}

/**
 * Appointment reminder job (§48). Kept out of any request path — call it from a
 * cron/queue, never from a page render.
 */
export async function sendAppointmentReminderBatch(
  recipients: { email: string; data: AppointmentEmailData & { hoursBefore: number } }[],
): Promise<{ attempted: number; delivered: number }> {
  let delivered = 0;

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.email,
      subject: `Reminder: appointment in ${recipient.data.hoursBefore} hour${recipient.data.hoursBefore === 1 ? "" : "s"}`,
      html: shell(
        `Appointment reminder — in ${recipient.data.hoursBefore} hour${recipient.data.hoursBefore === 1 ? "" : "s"}`,
        `<p style="margin:0 0 16px;">Hello ${escapeHtml(recipient.data.patientName)}, this is a reminder of your upcoming appointment.</p>
         ${appointmentRows(recipient.data)}`,
      ),
      text: `Hello ${recipient.data.patientName},\n\nReminder: your appointment with ${recipient.data.doctorName} is at ${recipient.data.startAtLabel}.`,
    });
    if (result.delivered) delivered += 1;
  }

  return { attempted: recipients.length, delivered };
}