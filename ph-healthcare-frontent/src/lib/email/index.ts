/**
 * Public surface of the email layer (§47).
 *
 * Application code imports from here, never from `transporter` or `templates`
 * directly. That single indirection is what keeps the provider swappable: replace
 * the transport inside `transporter.ts` and every call site is unaffected.
 */
export {
  sendAppointmentCancellationEmail,
  sendAppointmentConfirmationEmail,
  sendAppointmentReminderBatch,
  sendAppointmentReminderEmail,
  sendLabReportAvailableEmail,
  sendPasswordResetEmail,
  sendPaymentReceiptEmail,
  sendPrescriptionAvailableEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  type AppointmentEmailData,
} from "@/lib/email/templates";

export { isEmailConfigured, sendEmail } from "@/lib/email/transporter";
