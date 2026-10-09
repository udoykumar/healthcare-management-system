import { z } from "zod";

import {
  dateOnlySchema,
  emailSchema,
  idSchema,
  passwordSchema,
  phoneSchema,
  timeSchema,
} from "@/lib/api/validate";

/**
 * Shared Zod schemas.
 *
 * These are imported by both the client components and the server actions /
 * route handlers that consume them. One definition means the validation a user
 * sees while typing is exactly the validation enforced on submit — a separate
 * copy on each side is how "the form said it was fine but the API rejected it"
 * bugs happen.
 */

// ─── Authentication ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  // No strength rules here: rejecting a weak password at the login prompt would
  // tell an attacker whether a guessed password is the right shape.
  password: z.string().min(1, "Enter your password.").max(200),
  callbackUrl: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "This reset link is not valid."),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * Registration is patient-only: staff accounts are created by an administrator.
 *
 * There is no `role` field, and that is deliberate rather than an omission. The
 * role is written server-side from a constant in `registerAction`; giving the
 * schema a place for one would only create something for a caller to tamper with.
 *
 * Note there is no `refine` needed for the password match either — see below.
 */
const registerFields = z.object({
  firstName: z.string().trim().min(2, "Enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  dateOfBirth: dateOnlySchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]),
  healthcareCenterId: idSchema,
  acceptTerms: z.literal(true, {
    message: "You must accept the terms to register.",
  }),
});

/*
 * A mismatch has to fail here rather than in the action: `registerAction` only ever
 * reads `input.password`, so without this check a typo in the confirmation field
 * would be silently ignored and the account would be created with a password the
 * user did not think they had chosen.
 */
export const registerSchema = registerFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  },
);

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Makes a field genuinely optional, treating an empty string as "not supplied".
 *
 * An HTML form submits `""` for every untouched input, so `""` has to mean the same
 * thing as an absent key. The `.optional()` on the *inside* is the part that
 * matters: without it, the preprocessed `undefined` is handed straight to the
 * wrapped schema and rejected as a missing value — which turns every optional
 * field in every schema in this file into a required one, and makes a payload that
 * omits the field fail validation.
 */
export const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );

// ─── Patient ──────────────────────────────────────────────────────────────────

export const patientSchema = z.object({
  firstName: z.string().trim().min(2, "Enter a first name.").max(60),
  lastName: z.string().trim().min(1, "Enter a last name.").max(60),
  dateOfBirth: dateOnlySchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]),
  bloodGroup: z
    .enum([
      "A_POSITIVE",
      "A_NEGATIVE",
      "B_POSITIVE",
      "B_NEGATIVE",
      "AB_POSITIVE",
      "AB_NEGATIVE",
      "O_POSITIVE",
      "O_NEGATIVE",
      "UNKNOWN",
    ])
    .default("UNKNOWN"),
  email: emptyStringToUndefined(emailSchema),
  phone: phoneSchema,
  addressLine1: emptyStringToUndefined(z.string().trim().max(200)),
  addressLine2: emptyStringToUndefined(z.string().trim().max(200)),
  city: emptyStringToUndefined(z.string().trim().max(80)),
  state: emptyStringToUndefined(z.string().trim().max(80)),
  postalCode: emptyStringToUndefined(z.string().trim().max(20)),
  country: emptyStringToUndefined(z.string().trim().max(80)).default("Bangladesh"),
  emergencyContactName: emptyStringToUndefined(z.string().trim().max(120)),
  emergencyContactPhone: phoneSchema,
  emergencyContactRelationship: emptyStringToUndefined(
    z.enum([
      "SPOUSE",
      "PARENT",
      "CHILD",
      "SIBLING",
      "FRIEND",
      "COLLEAGUE",
      "CAREGIVER",
      "OTHER",
    ]),
  ),
  profilePhotoUrl: emptyStringToUndefined(z.string().trim().url().max(500)),
  familyMedicalHistory: emptyStringToUndefined(z.string().trim().max(2000)),
  insuranceProvider: emptyStringToUndefined(z.string().trim().max(120)),
  insuranceNumber: emptyStringToUndefined(z.string().trim().max(80)),
  insuranceGroup: emptyStringToUndefined(z.string().trim().max(80)),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type PatientInput = z.infer<typeof patientSchema>;

// ─── Doctor ───────────────────────────────────────────────────────────────────

export const doctorSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(2, "Enter a first name.").max(60),
  lastName: z.string().trim().min(1, "Enter a last name.").max(60),
  phone: phoneSchema,
  gender: emptyStringToUndefined(
    z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]),
  ),
  dateOfBirth: emptyStringToUndefined(dateOnlySchema),
  licenseNumber: z
    .string()
    .trim()
    .min(3, "Enter a license number.")
    .max(60),
  qualification: z.string().trim().min(2, "Enter qualifications.").max(300),
  specialization: emptyStringToUndefined(z.string().trim().max(200)),
  departmentId: emptyStringToUndefined(idSchema),
  experienceYears: z.coerce
    .number()
    .int()
    .min(0, "Cannot be negative.")
    .max(70, "Enter a realistic number of years.")
    .default(0),
  consultationFee: z.coerce.number().min(0, "Cannot be negative.").max(1_000_000).default(0),
  bio: emptyStringToUndefined(z.string().trim().max(2000)),
  addressLine1: emptyStringToUndefined(z.string().trim().max(200)),
  city: emptyStringToUndefined(z.string().trim().max(80)),
  postalCode: emptyStringToUndefined(z.string().trim().max(20)),
  country: emptyStringToUndefined(z.string().trim().max(80)),
  bloodGroup: emptyStringToUndefined(
    z.enum([
      "A_POSITIVE",
      "A_NEGATIVE",
      "B_POSITIVE",
      "B_NEGATIVE",
      "AB_POSITIVE",
      "AB_NEGATIVE",
      "O_POSITIVE",
      "O_NEGATIVE",
      "UNKNOWN",
    ]),
  ),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type DoctorInput = z.infer<typeof doctorSchema>;

// ─── Department ───────────────────────────────────────────────────────────────

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Enter a department name.").max(120),
  description: emptyStringToUndefined(z.string().trim().max(1000)),
  phone: phoneSchema,
  email: emptyStringToUndefined(emailSchema),
  location: emptyStringToUndefined(z.string().trim().max(160)),
  headDoctorId: emptyStringToUndefined(idSchema),
  defaultConsultationFee: z.coerce.number().min(0).max(1_000_000).default(0),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// ─── Schedule ─────────────────────────────────────────────────────────────────

export const doctorScheduleSchema = z
  .object({
    dayOfWeek: z.enum([
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ]),
    startTime: timeSchema,
    endTime: timeSchema,
    breakStartTime: emptyStringToUndefined(timeSchema),
    breakEndTime: emptyStringToUndefined(timeSchema),
    slotDurationMinutes: z.coerce
      .number()
      .int()
      .min(5, "Minimum slot length is 5 minutes.")
      .max(240, "Maximum slot length is 240 minutes.")
      .default(20),
    maxAppointmentsPerDay: z.coerce.number().int().min(0).max(200).optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  })
  .refine(
    (data) =>
      !data.breakStartTime ||
      !data.breakEndTime ||
      (data.breakStartTime > data.startTime &&
        data.breakEndTime < data.endTime &&
        data.breakEndTime > data.breakStartTime),
    {
      message: "The break must sit inside the working block and end after it starts.",
      path: ["breakEndTime"],
    },
  );

export type DoctorScheduleInput = z.infer<typeof doctorScheduleSchema>;

export const doctorLeaveSchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    type: z.enum(["SICK", "ANNUAL", "UNPAID", "CONFERENCE", "OTHER"]).default("ANNUAL"),
    reason: emptyStringToUndefined(z.string().trim().max(500)),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

// ─── Appointment ──────────────────────────────────────────────────────────────

export const appointmentTypeSchema = z.enum([
  "IN_PERSON",
  "ONLINE",
  "FOLLOW_UP",
  "EMERGENCY",
]);

export const bookAppointmentSchema = z
  .object({
    doctorId: idSchema,
    patientId: emptyStringToUndefined(idSchema),
    startAt: z.coerce.date(),
    type: appointmentTypeSchema.default("IN_PERSON"),
    reason: emptyStringToUndefined(z.string().trim().min(3).max(500)),
    notes: emptyStringToUndefined(z.string().trim().max(1000)),
    departmentId: emptyStringToUndefined(idSchema),
  })
  .refine((data) => data.startAt.getTime() > Date.now() - 60_000, {
    message: "Choose a time in the future.",
    path: ["startAt"],
  });

export const rescheduleAppointmentSchema = z.object({
  startAt: z.coerce.date(),
  reason: emptyStringToUndefined(z.string().trim().max(500)),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
  cancellationReason: emptyStringToUndefined(
    z.enum([
      "PATIENT_REQUEST",
      "DOCTOR_UNAVAILABLE",
      "CENTER_CLOSED",
      "NO_SHOW",
      "OTHER",
    ]),
  ),
  notes: emptyStringToUndefined(z.string().trim().max(1000)),
});

export const appointmentFilterSchema = z.object({
  doctorId: emptyStringToUndefined(idSchema),
  patientId: emptyStringToUndefined(idSchema),
  departmentId: emptyStringToUndefined(idSchema),
  status: emptyStringToOptionalEnum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "RESCHEDULED",
  ]),
  type: emptyStringToOptionalEnum(appointmentTypeSchema.options),
  dateFrom: emptyStringToUndefined(dateOnlySchema),
  dateTo: emptyStringToUndefined(dateOnlySchema),
});

/**
 * Accepts an enum value or the empty string an untouched <select> submits, and
 * normalizes the latter to undefined.
 */
function emptyStringToOptionalEnum<const T extends readonly string[]>(values: T) {
  return z
    .union([z.enum(values as unknown as [string, ...string[]]), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value));
}

// ─── Clinical ─────────────────────────────────────────────────────────────────

export const vitalSignsSchema = z.object({
  bloodPressureSystolic: emptyStringToUndefined(z.coerce.number().min(40).max(300)),
  bloodPressureDiastolic: emptyStringToUndefined(z.coerce.number().min(20).max(200)),
  heartRate: emptyStringToUndefined(z.coerce.number().min(20).max(300)),
  temperature: emptyStringToUndefined(z.coerce.number().min(25).max(45)),
  respiratoryRate: emptyStringToUndefined(z.coerce.number().min(4).max(80)),
  oxygenSaturation: emptyStringToUndefined(z.coerce.number().min(50).max(100)),
  weight: emptyStringToUndefined(z.coerce.number().min(0.5).max(500)),
  height: emptyStringToUndefined(z.coerce.number().min(20).max(260)),
  notes: emptyStringToUndefined(z.string().trim().max(1000)),
  measuredAt: z.coerce.date().optional(),
});

export const diagnosisSchema = z.object({
  type: z.enum(["PRIMARY", "SECONDARY", "DIFFERENTIAL", "COMPLICATION"]).default("PRIMARY"),
  description: z.string().trim().min(2, "Describe the diagnosis.").max(500),
  icd10Code: emptyStringToUndefined(z.string().trim().max(20)),
  notes: emptyStringToUndefined(z.string().trim().max(2000)),
  diagnosedAt: z.coerce.date().optional(),
});

export const medicalRecordSchema = z.object({
  patientId: idSchema,
  doctorId: emptyStringToUndefined(idSchema),
  appointmentId: emptyStringToUndefined(idSchema),
  visitDate: z.coerce.date(),
  chiefComplaint: emptyStringToUndefined(z.string().trim().max(500)),
  symptoms: emptyStringToUndefined(z.string().trim().max(4000)),
  examination: emptyStringToUndefined(z.string().trim().max(4000)),
  treatmentPlan: emptyStringToUndefined(z.string().trim().max(4000)),
  clinicalNotes: emptyStringToUndefined(z.string().trim().max(8000)),
  adviceGiven: emptyStringToUndefined(z.string().trim().max(4000)),
  followUpDate: emptyStringToUndefined(
    z.coerce.date().refine((d) => d > new Date(), "Follow-up must be in the future."),
  ),
});

export const prescriptionSchema = z.object({
  patientId: idSchema,
  medicalRecordId: idSchema,
  appointmentId: emptyStringToUndefined(idSchema),
  diagnosisSummary: emptyStringToUndefined(z.string().trim().max(1000)),
  instructions: emptyStringToUndefined(z.string().trim().max(2000)),
  generalAdvice: emptyStringToUndefined(z.string().trim().max(2000)),
  followUpDate: emptyStringToUndefined(
    z.coerce.date().refine((d) => d > new Date(), "Follow-up must be in the future."),
  ),
  /** Issued straight away, or saved as a draft to finish later. */
  issueNow: z.boolean().default(true),
  items: z
    .array(
      z.object({
        medicineId: emptyStringToUndefined(idSchema),
        medicineName: z.string().trim().min(1, "Enter the medicine name.").max(200),
        dosage: z.string().trim().min(1, "Enter a dosage.").max(100),
        frequency: z.enum([
          "ONCE_DAILY",
          "TWICE_DAILY",
          "THREE_TIMES_DAILY",
          "FOUR_TIMES_DAILY",
          "EVERY_4_HOURS",
          "EVERY_6_HOURS",
          "EVERY_8_HOURS",
          "AS_NEEDED",
          "AT_BEDTIME",
          "BEFORE_MEALS",
          "AFTER_MEALS",
          "WITH_MEALS",
          "OTHER",
        ]),
        frequencyText: emptyStringToUndefined(z.string().trim().max(120)),
        duration: z.string().trim().min(1, "Enter a duration.").max(100),
        route: z
          .enum([
            "ORAL",
            "IV",
            "IM",
            "SUBCUTANEOUS",
            "TOPICAL",
            "INHALATION",
            "RECTAL",
            "OPHTHALMIC",
            "OTIC",
            "TRANSDERMAL",
            "OTHER",
          ])
          .default("ORAL"),
        instructions: emptyStringToUndefined(z.string().trim().max(500)),
        quantity: z.coerce.number().int().min(0).max(10_000).optional(),
      }),
    )
    .min(1, "Add at least one medicine.")
    .max(50, "A prescription cannot exceed 50 lines."),
});

// ─── Medicine ─────────────────────────────────────────────────────────────────

export const medicineSchema = z.object({
  name: z.string().trim().min(2, "Enter a medicine name.").max(200),
  genericName: emptyStringToUndefined(z.string().trim().max(200)),
  brandName: emptyStringToUndefined(z.string().trim().max(200)),
  category: emptyStringToUndefined(z.string().trim().max(120)),
  manufacturer: emptyStringToUndefined(z.string().trim().max(160)),
  description: emptyStringToUndefined(z.string().trim().max(2000)),
  dosageForm: z
    .enum([
      "TABLET",
      "CAPSULE",
      "SYRUP",
      "SUSPENSION",
      "INJECTION",
      "CREAM",
      "OINTMENT",
      "DROPS",
      "INHALER",
      "PATCH",
      "SUPPOSITORY",
      "OTHER",
    ])
    .default("TABLET"),
  strength: emptyStringToUndefined(z.string().trim().max(80)),
  minimumStockLevel: z.coerce.number().int().min(0).max(1_000_000).default(0),
  unitPrice: z.coerce.number().min(0).max(1_000_000).default(0),
  isPrescribable: z.boolean().default(true),
  requiresPrescription: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  /** Opening stock, written as the first batch on create. */
  initialQuantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
  batchNumber: emptyStringToUndefined(z.string().trim().max(60)),
  expiresOn: emptyStringToUndefined(dateOnlySchema),
});

export const stockAdjustmentSchema = z.object({
  stockBatchId: idSchema,
  type: z.enum(["PURCHASE", "DISPENSE", "RETURN", "ADJUSTMENT", "EXPIRED"]),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Enter a non-zero quantity."),
  reason: emptyStringToUndefined(z.string().trim().max(300)),
});

// ─── Laboratory ───────────────────────────────────────────────────────────────

export const labTestSchema = z.object({
  name: z.string().trim().min(2, "Enter a test name.").max(200),
  shortName: emptyStringToUndefined(z.string().trim().max(60)),
  description: emptyStringToUndefined(z.string().trim().max(2000)),
  categoryId: emptyStringToUndefined(idSchema),
  departmentId: emptyStringToUndefined(idSchema),
  price: z.coerce.number().min(0).max(1_000_000).default(0),
  turnaroundHours: z.coerce.number().int().min(1).max(720).default(24),
  sampleType: emptyStringToUndefined(z.string().trim().max(120)),
  sampleContainer: emptyStringToUndefined(z.string().trim().max(120)),
  preparationInstructions: emptyStringToUndefined(z.string().trim().max(1000)),
  requiresFasting: z.boolean().default(false),
  method: emptyStringToUndefined(z.string().trim().max(120)),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  parameters: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Enter a parameter name.").max(120),
        shortName: emptyStringToUndefined(z.string().trim().max(40)),
        unit: emptyStringToUndefined(z.string().trim().max(40)),
        referenceRangeLow: emptyStringToUndefined(z.coerce.number()),
        referenceRangeHigh: emptyStringToUndefined(z.coerce.number()),
        referenceRangeText: emptyStringToUndefined(z.string().trim().max(120)),
        criticalRangeLow: emptyStringToUndefined(z.coerce.number()),
        criticalRangeHigh: emptyStringToUndefined(z.coerce.number()),
        lowIsAbnormal: z.boolean().default(true),
        highIsAbnormal: z.boolean().default(true),
        isQualitative: z.boolean().default(false),
        decimalPlaces: emptyStringToUndefined(z.coerce.number().int().min(0).max(6)),
      }),
    )
    .max(100)
    .default([]),
});

export const labRequestSchema = z.object({
  patientId: idSchema,
  medicalRecordId: emptyStringToUndefined(idSchema),
  appointmentId: emptyStringToUndefined(idSchema),
  testIds: z.array(idSchema).min(1, "Select at least one test.").max(30),
  priority: z.enum(["ROUTINE", "URGENT", "STAT"]).default("ROUTINE"),
  clinicalNotes: emptyStringToUndefined(z.string().trim().max(2000)),
  provisionalDiagnosis: emptyStringToUndefined(z.string().trim().max(500)),
});

export const labResultSchema = z.object({
  labRequestId: idSchema,
  performedByName: z.string().trim().min(2, "Enter the technician's name.").max(120),
  summary: emptyStringToUndefined(z.string().trim().max(2000)),
  notes: emptyStringToUndefined(z.string().trim().max(2000)),
  publish: z.boolean().default(true),
  values: z
    .array(
      z.object({
        parameterId: idSchema,
        resultValue: emptyStringToUndefined(z.coerce.number()),
        resultText: emptyStringToUndefined(z.string().trim().max(200)),
      }),
    )
    .min(1, "Enter at least one result value."),
});

// ─── Billing ──────────────────────────────────────────────────────────────────

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Enter a service name.").max(200),
  description: emptyStringToUndefined(z.string().trim().max(1000)),
  category: emptyStringToUndefined(z.string().trim().max(120)),
  price: z.coerce.number().min(0).max(1_000_000).default(0),
  durationMinutes: emptyStringToUndefined(z.coerce.number().int().min(1).max(1440)),
  isBookable: z.boolean().default(true),
  requiresDoctorOrder: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const invoiceItemInputSchema = z.object({
  serviceId: emptyStringToUndefined(idSchema),
  medicineId: emptyStringToUndefined(idSchema),
  labRequestItemId: emptyStringToUndefined(idSchema),
  description: z.string().trim().min(1, "Enter a description.").max(300),
  detail: emptyStringToUndefined(z.string().trim().max(300)),
  quantity: z.coerce.number().min(0.01).max(100_000),
  /** Unit price is re-read from the catalogue server-side when a source is given. */
  unitPrice: z.coerce.number().min(0).max(1_000_000),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  patientId: idSchema,
  appointmentId: emptyStringToUndefined(idSchema),
  doctorId: emptyStringToUndefined(idSchema),
  dueAt: emptyStringToUndefined(z.coerce.date()),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: emptyStringToUndefined(z.coerce.number().min(0).max(100)),
  notes: emptyStringToUndefined(z.string().trim().max(1000)),
  terms: emptyStringToUndefined(z.string().trim().max(2000)),
  items: z.array(invoiceItemInputSchema).min(1, "Add at least one line.").max(100),
});

export const recordPaymentSchema = z.object({
  invoiceId: idSchema,
  amount: z.coerce.number().positive("Enter an amount greater than zero.").max(1_000_000),
  method: z.enum([
    "CASH",
    "CARD",
    "BANK_TRANSFER",
    "MOBILE_PAYMENT",
    "ONLINE_PAYMENT",
    "INSURANCE",
  ]),
  transactionId: emptyStringToUndefined(z.string().trim().max(120)),
  cardLast4: emptyStringToUndefined(
    z.string().trim().regex(/^\d{4}$/, "Enter the last 4 digits only."),
  ),
  bankName: emptyStringToUndefined(z.string().trim().max(120)),
  notes: emptyStringToUndefined(z.string().trim().max(500)),
});

export const refundPaymentSchema = z.object({
  paymentId: idSchema,
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  reason: z.string().trim().min(3, "Give a reason for the refund.").max(500),
});

// ─── Reviews & notifications ──────────────────────────────────────────────────

export const reviewSchema = z.object({
  appointmentId: idSchema,
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  comment: emptyStringToUndefined(z.string().trim().max(2000)),
});

export const moderateReviewSchema = z.object({
  reviewId: idSchema,
  status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]),
  reason: emptyStringToUndefined(z.string().trim().max(500)),
});