import { RoleKey } from "@/generated/prisma/enums";

/**
 * The permission catalogue.
 *
 * Permissions are stored in the `permissions` table (so SUPERADMIN can edit what
 * a role grants at runtime) and seeded from this list, which is the single source
 * of truth for the *set* of valid codes. The union below is what the type system
 * checks against, so a typo in a `requirePermission("patinet:read")` call is a
 * compile error rather than a silent denial.
 *
 * Codes are `resource:action`, lowercase resource, lowercase action.
 */

export const PERMISSIONS = {
  // Centers (SUPERADMIN scope)
  CENTER_CREATE: "center:create",
  CENTER_READ: "center:read",
  CENTER_UPDATE: "center:update",
  CENTER_DELETE: "center:delete",
  CENTER_STATUS_CHANGE: "center:status-change",

  // Users & access control
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_ROLE_CHANGE: "user:role-change",
  USER_STATUS_CHANGE: "user:status-change",
  PERMISSION_MANAGE: "permission:manage",

  // Patients
  PATIENT_CREATE: "patient:create",
  PATIENT_READ: "patient:read",
  PATIENT_READ_OWN: "patient:read-own",
  PATIENT_UPDATE: "patient:update",
  PATIENT_UPDATE_OWN: "patient:update-own",
  PATIENT_DELETE: "patient:delete",
  PATIENT_VIEW_CLINICAL: "patient:view-clinical",

  // Doctors & staff
  DOCTOR_CREATE: "doctor:create",
  DOCTOR_READ: "doctor:read",
  DOCTOR_UPDATE: "doctor:update",
  DOCTOR_STATUS_CHANGE: "doctor:status-change",
  DOCTOR_READ_OWN: "doctor:read-own",
  DOCTOR_UPDATE_OWN: "doctor:update-own",
  STAFF_CREATE: "staff:create",
  STAFF_READ: "staff:read",
  STAFF_UPDATE: "staff:update",
  STAFF_DELETE: "staff:delete",

  // Departments
  DEPARTMENT_CREATE: "department:create",
  DEPARTMENT_READ: "department:read",
  DEPARTMENT_UPDATE: "department:update",
  DEPARTMENT_DELETE: "department:delete",

  // Appointments
  APPOINTMENT_CREATE: "appointment:create",
  APPOINTMENT_CREATE_OWN: "appointment:create-own",
  APPOINTMENT_READ: "appointment:read",
  APPOINTMENT_READ_OWN: "appointment:read-own",
  APPOINTMENT_UPDATE: "appointment:update",
  APPOINTMENT_UPDATE_OWN: "appointment:update-own",
  APPOINTMENT_CANCEL: "appointment:cancel",
  APPOINTMENT_CANCEL_OWN: "appointment:cancel-own",
  APPOINTMENT_STATUS_CHANGE: "appointment:status-change",
  APPOINTMENT_RESCHEDULE: "appointment:reschedule",

  // Schedules
  SCHEDULE_READ: "schedule:read",
  SCHEDULE_READ_OWN: "schedule:read-own",
  SCHEDULE_MANAGE: "schedule:manage",
  SCHEDULE_MANAGE_OWN: "schedule:manage-own",
  LEAVE_MANAGE: "leave:manage",
  LEAVE_MANAGE_OWN: "leave:manage-own",

  // Clinical
  RECORD_CREATE: "record:create",
  RECORD_READ: "record:read",
  RECORD_READ_OWN: "record:read-own",
  RECORD_UPDATE: "record:update",
  DIAGNOSIS_CREATE: "diagnosis:create",
  DIAGNOSIS_READ: "diagnosis:read",
  VITAL_CREATE: "vital:create",
  VITAL_READ: "vital:read",

  // Prescriptions & medicines
  PRESCRIPTION_CREATE: "prescription:create",
  PRESCRIPTION_READ: "prescription:read",
  PRESCRIPTION_READ_OWN: "prescription:read-own",
  MEDICINE_CREATE: "medicine:create",
  MEDICINE_READ: "medicine:read",
  MEDICINE_UPDATE: "medicine:update",
  MEDICINE_DELETE: "medicine:delete",
  STOCK_MANAGE: "stock:manage",
  STOCK_READ: "stock:read",

  // Laboratory
  LAB_TEST_CREATE: "lab-test:create",
  LAB_TEST_READ: "lab-test:read",
  LAB_TEST_UPDATE: "lab-test:update",
  LAB_REQUEST_CREATE: "lab-request:create",
  LAB_REQUEST_READ: "lab-request:read",
  LAB_REQUEST_READ_OWN: "lab-request:read-own",
  LAB_RESULT_CREATE: "lab-result:create",
  LAB_RESULT_READ: "lab-result:read",
  LAB_RESULT_READ_OWN: "lab-result:read-own",

  // Services, billing, payments
  SERVICE_CREATE: "service:create",
  SERVICE_READ: "service:read",
  SERVICE_UPDATE: "service:update",
  SERVICE_DELETE: "service:delete",
  INVOICE_CREATE: "invoice:create",
  INVOICE_READ: "invoice:read",
  INVOICE_READ_OWN: "invoice:read-own",
  INVOICE_UPDATE: "invoice:update",
  INVOICE_CANCEL: "invoice:cancel",
  PAYMENT_CREATE: "payment:create",
  PAYMENT_CREATE_OWN: "payment:create-own",
  PAYMENT_READ: "payment:read",
  PAYMENT_READ_OWN: "payment:read-own",
  PAYMENT_REFUND: "payment:refund",

  // Engagement
  NOTIFICATION_READ_OWN: "notification:read-own",
  NOTIFICATION_SEND: "notification:send",
  REVIEW_CREATE: "review:create",
  REVIEW_READ: "review:read",
  REVIEW_MODERATE: "review:moderate",
  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_READ: "document:read",
  DOCUMENT_READ_OWN: "document:read-own",
  DOCUMENT_DELETE: "document:delete",

  // Reporting & audit
  REPORT_READ: "report:read",
  REPORT_READ_OWN: "report:read-own",
  AUDIT_LOG_READ: "audit-log:read",
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Every code, for seeding the permissions table. */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSIONS.CENTER_CREATE]: "Create a healthcare center",
  [PERMISSIONS.CENTER_READ]: "View healthcare centers",
  [PERMISSIONS.CENTER_UPDATE]: "Edit healthcare center details",
  [PERMISSIONS.CENTER_DELETE]: "Delete a healthcare center",
  [PERMISSIONS.CENTER_STATUS_CHANGE]: "Activate or deactivate a healthcare center",

  [PERMISSIONS.USER_CREATE]: "Create users of any role",
  [PERMISSIONS.USER_READ]: "View users",
  [PERMISSIONS.USER_UPDATE]: "Edit users",
  [PERMISSIONS.USER_DELETE]: "Delete users",
  [PERMISSIONS.USER_ROLE_CHANGE]: "Change a user's role",
  [PERMISSIONS.USER_STATUS_CHANGE]: "Block or unblock a user",
  [PERMISSIONS.PERMISSION_MANAGE]: "Edit roles and permissions",

  [PERMISSIONS.PATIENT_CREATE]: "Register a patient",
  [PERMISSIONS.PATIENT_READ]: "View any patient in the center",
  [PERMISSIONS.PATIENT_READ_OWN]: "View their own patient record",
  [PERMISSIONS.PATIENT_UPDATE]: "Edit any patient in the center",
  [PERMISSIONS.PATIENT_UPDATE_OWN]: "Edit their own demographics",
  [PERMISSIONS.PATIENT_DELETE]: "Remove a patient",
  [PERMISSIONS.PATIENT_VIEW_CLINICAL]: "View a patient's clinical history",

  [PERMISSIONS.DOCTOR_CREATE]: "Add a doctor",
  [PERMISSIONS.DOCTOR_READ]: "View doctors",
  [PERMISSIONS.DOCTOR_UPDATE]: "Edit a doctor's profile",
  [PERMISSIONS.DOCTOR_STATUS_CHANGE]: "Activate or deactivate a doctor",
  [PERMISSIONS.DOCTOR_READ_OWN]: "View their own doctor profile",
  [PERMISSIONS.DOCTOR_UPDATE_OWN]: "Edit their own doctor profile",
  [PERMISSIONS.STAFF_CREATE]: "Add staff",
  [PERMISSIONS.STAFF_READ]: "View staff",
  [PERMISSIONS.STAFF_UPDATE]: "Edit staff",
  [PERMISSIONS.STAFF_DELETE]: "Remove staff",

  [PERMISSIONS.DEPARTMENT_CREATE]: "Create a department",
  [PERMISSIONS.DEPARTMENT_READ]: "View departments",
  [PERMISSIONS.DEPARTMENT_UPDATE]: "Edit a department",
  [PERMISSIONS.DEPARTMENT_DELETE]: "Deactivate a department",

  [PERMISSIONS.APPOINTMENT_CREATE]: "Book an appointment for any patient",
  [PERMISSIONS.APPOINTMENT_CREATE_OWN]: "Book an appointment for themselves",
  [PERMISSIONS.APPOINTMENT_READ]: "View any appointment in the center",
  [PERMISSIONS.APPOINTMENT_READ_OWN]: "View their own appointments",
  [PERMISSIONS.APPOINTMENT_UPDATE]: "Edit any appointment",
  [PERMISSIONS.APPOINTMENT_UPDATE_OWN]: "Reschedule their own appointment",
  [PERMISSIONS.APPOINTMENT_CANCEL]: "Cancel any appointment",
  [PERMISSIONS.APPOINTMENT_CANCEL_OWN]: "Cancel their own appointment",
  [PERMISSIONS.APPOINTMENT_STATUS_CHANGE]: "Check in, start, complete appointments",
  [PERMISSIONS.APPOINTMENT_RESCHEDULE]: "Reschedule any appointment",

  [PERMISSIONS.SCHEDULE_READ]: "View any doctor's schedule",
  [PERMISSIONS.SCHEDULE_READ_OWN]: "View their own schedule",
  [PERMISSIONS.SCHEDULE_MANAGE]: "Edit any doctor's schedule",
  [PERMISSIONS.SCHEDULE_MANAGE_OWN]: "Edit their own schedule",
  [PERMISSIONS.LEAVE_MANAGE]: "Approve or reject leave for any doctor",
  [PERMISSIONS.LEAVE_MANAGE_OWN]: "Request their own leave",

  [PERMISSIONS.RECORD_CREATE]: "Create a consultation record",
  [PERMISSIONS.RECORD_READ]: "View any clinical record",
  [PERMISSIONS.RECORD_READ_OWN]: "View their own clinical record",
  [PERMISSIONS.RECORD_UPDATE]: "Edit a clinical record",
  [PERMISSIONS.DIAGNOSIS_CREATE]: "Record a diagnosis",
  [PERMISSIONS.DIAGNOSIS_READ]: "View diagnoses",
  [PERMISSIONS.VITAL_CREATE]: "Record vital signs",
  [PERMISSIONS.VITAL_READ]: "View vital signs",

  [PERMISSIONS.PRESCRIPTION_CREATE]: "Write a prescription",
  [PERMISSIONS.PRESCRIPTION_READ]: "View any prescription",
  [PERMISSIONS.PRESCRIPTION_READ_OWN]: "View their own prescriptions",
  [PERMISSIONS.MEDICINE_CREATE]: "Add a medicine to the catalogue",
  [PERMISSIONS.MEDICINE_READ]: "View the medicine catalogue",
  [PERMISSIONS.MEDICINE_UPDATE]: "Edit a medicine",
  [PERMISSIONS.MEDICINE_DELETE]: "Deactivate a medicine",
  [PERMISSIONS.STOCK_MANAGE]: "Adjust medicine stock",
  [PERMISSIONS.STOCK_READ]: "View stock levels",

  [PERMISSIONS.LAB_TEST_CREATE]: "Create a laboratory test",
  [PERMISSIONS.LAB_TEST_READ]: "View the laboratory test catalogue",
  [PERMISSIONS.LAB_TEST_UPDATE]: "Edit a laboratory test",
  [PERMISSIONS.LAB_REQUEST_CREATE]: "Request a laboratory test",
  [PERMISSIONS.LAB_REQUEST_READ]: "View any lab request",
  [PERMISSIONS.LAB_REQUEST_READ_OWN]: "View their own lab requests",
  [PERMISSIONS.LAB_RESULT_CREATE]: "Record a laboratory result",
  [PERMISSIONS.LAB_RESULT_READ]: "View any laboratory result",
  [PERMISSIONS.LAB_RESULT_READ_OWN]: "View their own laboratory results",

  [PERMISSIONS.SERVICE_CREATE]: "Create a service",
  [PERMISSIONS.SERVICE_READ]: "View services",
  [PERMISSIONS.SERVICE_UPDATE]: "Edit a service",
  [PERMISSIONS.SERVICE_DELETE]: "Deactivate a service",
  [PERMISSIONS.INVOICE_CREATE]: "Create an invoice",
  [PERMISSIONS.INVOICE_READ]: "View any invoice",
  [PERMISSIONS.INVOICE_READ_OWN]: "View their own invoices",
  [PERMISSIONS.INVOICE_UPDATE]: "Edit a draft invoice",
  [PERMISSIONS.INVOICE_CANCEL]: "Cancel an invoice",
  [PERMISSIONS.PAYMENT_CREATE]: "Record a payment for any patient",
  [PERMISSIONS.PAYMENT_CREATE_OWN]: "Pay their own invoice",
  [PERMISSIONS.PAYMENT_READ]: "View any payment",
  [PERMISSIONS.PAYMENT_READ_OWN]: "View their own payments",
  [PERMISSIONS.PAYMENT_REFUND]: "Refund a payment",

  [PERMISSIONS.NOTIFICATION_READ_OWN]: "Read their own notifications",
  [PERMISSIONS.NOTIFICATION_SEND]: "Send notifications to users",
  [PERMISSIONS.REVIEW_CREATE]: "Review a doctor",
  [PERMISSIONS.REVIEW_READ]: "View reviews",
  [PERMISSIONS.REVIEW_MODERATE]: "Hide or restore reviews",
  [PERMISSIONS.DOCUMENT_UPLOAD]: "Upload documents for any patient",
  [PERMISSIONS.DOCUMENT_READ]: "Download any document",
  [PERMISSIONS.DOCUMENT_READ_OWN]: "Download their own documents",
  [PERMISSIONS.DOCUMENT_DELETE]: "Delete a document",

  [PERMISSIONS.REPORT_READ]: "View center-wide reports and analytics",
  [PERMISSIONS.REPORT_READ_OWN]: "View reports scoped to themselves",
  [PERMISSIONS.AUDIT_LOG_READ]: "View the audit log",
  [PERMISSIONS.SETTINGS_READ]: "View center settings",
  [PERMISSIONS.SETTINGS_UPDATE]: "Change center settings",
};

/**
 * Default role → permission grants.
 *
 * This is the seed data for `role_permissions`, not a runtime check: edits made
 * through the admin UI are read from the database instead. `SUPERADMIN` is
 * intentionally absent from the map because it is resolved through the
 * `Role.isSuperuser` flag rather than an enumerated list.
 *
 * The naming convention worth noticing: permissions come in `_OWN` pairs
 * ("view your own ..."). Keeping them separate rather than overloading one
 * permission is what lets a doctor read their own chart without being granted
 * read on every patient in the centre.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  Exclude<RoleKey, "SUPERADMIN">,
  Permission[]
> = {
  ADMIN: [
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_STATUS_CHANGE,

    PERMISSIONS.PATIENT_CREATE,
    PERMISSIONS.PATIENT_READ,
    PERMISSIONS.PATIENT_UPDATE,
    PERMISSIONS.PATIENT_DELETE,
    PERMISSIONS.PATIENT_VIEW_CLINICAL,

    PERMISSIONS.DOCTOR_CREATE,
    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.DOCTOR_UPDATE,
    PERMISSIONS.DOCTOR_STATUS_CHANGE,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,

    PERMISSIONS.DEPARTMENT_CREATE,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.DEPARTMENT_UPDATE,
    PERMISSIONS.DEPARTMENT_DELETE,

    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.APPOINTMENT_STATUS_CHANGE,
    PERMISSIONS.APPOINTMENT_RESCHEDULE,

    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.LEAVE_MANAGE,

    PERMISSIONS.RECORD_READ,
    PERMISSIONS.DIAGNOSIS_READ,
    PERMISSIONS.VITAL_READ,

    PERMISSIONS.PRESCRIPTION_READ,
    PERMISSIONS.MEDICINE_CREATE,
    PERMISSIONS.MEDICINE_READ,
    PERMISSIONS.MEDICINE_UPDATE,
    PERMISSIONS.MEDICINE_DELETE,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.STOCK_READ,

    PERMISSIONS.LAB_TEST_CREATE,
    PERMISSIONS.LAB_TEST_READ,
    PERMISSIONS.LAB_TEST_UPDATE,
    PERMISSIONS.LAB_REQUEST_CREATE,
    PERMISSIONS.LAB_REQUEST_READ,
    PERMISSIONS.LAB_RESULT_CREATE,
    PERMISSIONS.LAB_RESULT_READ,

    PERMISSIONS.SERVICE_CREATE,
    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.SERVICE_UPDATE,
    PERMISSIONS.SERVICE_DELETE,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.INVOICE_CANCEL,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_REFUND,

    PERMISSIONS.NOTIFICATION_READ_OWN,
    PERMISSIONS.NOTIFICATION_SEND,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_MODERATE,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_DELETE,

    PERMISSIONS.REPORT_READ,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
  ],

  DOCTOR: [
    // Deliberately no PATIENT_READ: a doctor's patient list is derived from their
    // own appointments, so granting a blanket read would expose the whole centre.
    PERMISSIONS.PATIENT_READ_OWN,
    PERMISSIONS.PATIENT_UPDATE_OWN,

    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.DOCTOR_READ_OWN,
    PERMISSIONS.DOCTOR_UPDATE_OWN,

    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_READ,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_STATUS_CHANGE,

    PERMISSIONS.SCHEDULE_READ_OWN,
    PERMISSIONS.SCHEDULE_MANAGE_OWN,
    PERMISSIONS.LEAVE_MANAGE_OWN,

    PERMISSIONS.RECORD_CREATE,
    PERMISSIONS.RECORD_READ,
    PERMISSIONS.RECORD_UPDATE,
    PERMISSIONS.DIAGNOSIS_CREATE,
    PERMISSIONS.DIAGNOSIS_READ,
    PERMISSIONS.VITAL_CREATE,
    PERMISSIONS.VITAL_READ,

    PERMISSIONS.PRESCRIPTION_CREATE,
    PERMISSIONS.PRESCRIPTION_READ,
    PERMISSIONS.PRESCRIPTION_READ_OWN,
    PERMISSIONS.MEDICINE_READ,

    PERMISSIONS.LAB_TEST_READ,
    PERMISSIONS.LAB_REQUEST_CREATE,
    PERMISSIONS.LAB_REQUEST_READ,
    PERMISSIONS.LAB_REQUEST_READ_OWN,
    PERMISSIONS.LAB_RESULT_READ,
    PERMISSIONS.LAB_RESULT_READ_OWN,

    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.PAYMENT_READ,

    PERMISSIONS.NOTIFICATION_READ_OWN,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_READ_OWN,

    PERMISSIONS.REPORT_READ_OWN,
  ],

  PATIENT: [
    PERMISSIONS.PATIENT_READ_OWN,
    PERMISSIONS.PATIENT_UPDATE_OWN,

    PERMISSIONS.DOCTOR_READ,
    PERMISSIONS.DOCTOR_READ_OWN,

    PERMISSIONS.APPOINTMENT_CREATE_OWN,
    PERMISSIONS.APPOINTMENT_READ_OWN,
    PERMISSIONS.APPOINTMENT_CANCEL_OWN,
    PERMISSIONS.APPOINTMENT_UPDATE_OWN,

    PERMISSIONS.RECORD_READ_OWN,
    PERMISSIONS.DIAGNOSIS_READ,
    PERMISSIONS.VITAL_READ,
    PERMISSIONS.PRESCRIPTION_READ_OWN,
    PERMISSIONS.MEDICINE_READ,

    PERMISSIONS.LAB_TEST_READ,
    PERMISSIONS.LAB_REQUEST_READ_OWN,
    PERMISSIONS.LAB_RESULT_READ_OWN,

    PERMISSIONS.SERVICE_READ,
    PERMISSIONS.INVOICE_READ_OWN,
    PERMISSIONS.PAYMENT_CREATE_OWN,
    PERMISSIONS.PAYMENT_READ_OWN,

    PERMISSIONS.NOTIFICATION_READ_OWN,
    PERMISSIONS.REVIEW_CREATE,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_READ_OWN,

    PERMISSIONS.REPORT_READ_OWN,
  ],
};

/** Which roles may hold each role. Used to stop privilege escalation. */
export const ROLE_ASSIGNABLE_BY: Record<RoleKey, RoleKey[]> = {
  SUPERADMIN: ["SUPERADMIN"],
  ADMIN: ["SUPERADMIN", "ADMIN"],
  DOCTOR: ["SUPERADMIN", "ADMIN"],
  PATIENT: ["SUPERADMIN", "ADMIN", "DOCTOR", "PATIENT"],
};

export function canAssignRole(
  actorRole: RoleKey,
  targetRole: RoleKey,
): boolean {
  return ROLE_ASSIGNABLE_BY[targetRole].includes(actorRole);
}