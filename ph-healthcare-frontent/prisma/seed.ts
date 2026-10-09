import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  nextCode as nextSharedCode,
  nextYearCode as nextSharedYearCode,
} from "../src/lib/db/code-counter";
import {
  AppointmentStatus,
  AppointmentType,
  BloodGroup,
  DosageForm,
  Gender,
  LabRequestStatus,
  LabPriority,
  RecordStatus,
  RoleKey,
  UserStatus,
} from "../src/generated/prisma/enums";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
} from "../src/lib/authz/permissions";

/**
 * Seed data (§49).
 *
 * Everything here is obviously fictional: `example.com` addresses, "Demo" names,
 * and the password `Demo@12345` for every account. No real person, and no real
 * clinical detail, appears anywhere in this file.
 *
 * Safe to re-run. Each step is an upsert keyed on a stable natural key (email,
 * code, slug) rather than a create, so `prisma db seed` can be run repeatedly
 * without duplicating the catalogue or resetting clinical history.
 *
 * This is the only place outside the app that imports the password hasher; it uses
 * the same scrypt implementation production uses so seeded hashes verify.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT = { N: 32768, r: 8, p: 1 };

/** Same parameters and format as src/lib/auth/password.ts. */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, 64, {
    ...SCRYPT,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

const DEMO_PASSWORD = "Demo@12345";

const connectionString = process.env.DATABASE_URL as string;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Deterministic offsets so re-seeding does not keep drifting into the future. */
const NOW = new Date();
const daysFromNow = (days: number, hours = 9) => {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hours, 0, 0, 0);
  return date;
};
const daysAgo = (days: number, hours = 10) => daysFromNow(-days, hours);

/**
 * Delegates to the shared counter module (src/lib/db/code-counter.ts).
 *
 * The seed runs outside the app but must issue codes consistent with the running
 * application, so both use one implementation rather than two that can drift apart.
 */
function nextCode(prefix: string): Promise<string> {
  return nextSharedCode(prisma, prefix);
}

/** Per-year series, e.g. "APT-2026-000123". */
function nextYearCode(prefix: string, date: Date): Promise<string> {
  return nextSharedYearCode(prisma, prefix, date);
}


// ─── Steps ────────────────────────────────────────────────────────────────────

/**
 * Roles, permissions and their grants.
 *
 * Runs first: everything else needs a roleId. Note it never overwrites an
 * administrator's later edits — `role_permissions` rows are only created when
 * absent, so re-seeding does not silently revert a deliberate permission change.
 */
async function seedRbac() {
  const roleMeta: Record<
    RoleKey,
    { name: string; description: string; isSuperuser: boolean }
  > = {
    SUPERADMIN: {
      name: "Super Admin",
      description:
        "Platform-level access to every healthcare center and all system settings.",
      isSuperuser: true,
    },
    ADMIN: {
      name: "Administrator",
      description: "Manages day-to-day operations of one healthcare center.",
      isSuperuser: false,
    },
    DOCTOR: {
      name: "Doctor",
      description: "Clinical access limited to their own patients and records.",
      isSuperuser: false,
    },
    PATIENT: {
      name: "Patient",
      description: "Access limited to their own appointments and medical records.",
      isSuperuser: false,
    },
  };

  for (const [key, meta] of Object.entries(roleMeta) as [RoleKey, (typeof roleMeta)[RoleKey]][]) {
    await prisma.role.upsert({
      where: { key },
      update: { name: meta.name, description: meta.description },
      create: { key, name: meta.name, description: meta.description, isSystem: true, isSuperuser: meta.isSuperuser },
    });
  }

  // Permission catalogue.
  const permissionIds = new Map<string, string>();
  for (const code of ALL_PERMISSIONS) {
    const [resource, action] = code.split(":");
    const row = await prisma.permission.upsert({
      where: { code },
      update: { description: PERMISSION_DESCRIPTIONS[code] },
      create: {
        code,
        resource: resource ?? code,
        action: action ?? "read",
        description: PERMISSION_DESCRIPTIONS[code],
      },
      select: { id: true },
    });
    permissionIds.set(code, row.id);
  }

  // Default grants. insert-and-ignore so admin edits survive a re-seed.
  for (const [roleKey, codes] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [
    Exclude<RoleKey, "SUPERADMIN">,
    string[],
  ][]) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { key: roleKey },
      select: { id: true },
    });

    for (const code of codes) {
      const permissionId = permissionIds.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  console.log(
    `  rbac: 4 roles, ${permissionIds.size} permissions, ` +
      `${Object.values(DEFAULT_ROLE_PERMISSIONS).flat().length} grants`,
  );
}

async function seedCenter() {
  const existing = await prisma.healthcareCenter.findUnique({
    where: { slug: "demo-medical-center" },
  });

  if (existing) {
    console.log(`  center: ${existing.name} (already seeded)`);
    return existing;
  }

  const center = await prisma.healthcareCenter.create({
    data: {
      code: "HC-0001",
      name: "Demo Medical Center",
      slug: "demo-medical-center",
      status: UserStatus.ACTIVE,
      email: "contact@demo-medical-center.example",
      phone: "+8801000000000",
      addressLine1: "12 Example Road",
      city: "Dhaka",
      postalCode: "1000",
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
      currency: "USD",
      registrationNumber: "DEMO-REG-0001",
      taxPercentage: 0,
      description: "Fictional clinic used for development and demonstrations.",
    },
  });

  // A second center proves tenant isolation: data created here must never be
  // visible to users of the first one.
  const second = await prisma.healthcareCenter.create({
    data: {
      code: "HC-0002",
      name: "Second Demo Center",
      slug: "second-demo-center",
      status: UserStatus.ACTIVE,
      city: "Chattogram",
      country: "Bangladesh",
      timezone: "Asia/Dhaka",
      currency: "USD",
      description: "Second fictional center, used to verify multi-tenant isolation.",
    },
  });

  await prisma.systemSetting.createMany({
    data: [
      {
        key: "appointment.cancellation_window_hours",
        value: "24",
        valueType: "NUMBER",
        description: "Patients can cancel or reschedule free of charge until this many hours before.",
        isSystemKey: true,
        healthcareCenterId: center.id,
      },
      {
        key: "appointment.reminder_hours",
        value: "24,1",
        valueType: "STRING",
        description: "Comma-separated hours before an appointment at which to send reminders.",
        isSystemKey: true,
        healthcareCenterId: center.id,
      },
      {
        key: "billing.tax_percent",
        value: "0",
        valueType: "NUMBER",
        description: "Default tax applied to invoices when none is given.",
        isSystemKey: true,
        healthcareCenterId: center.id,
      },
      {
        key: "lab.turnaround_alert_hours",
        value: "48",
        valueType: "NUMBER",
        description: "Flag a lab request as overdue past this many hours.",
        isSystemKey: true,
        healthcareCenterId: center.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`  centers: ${center.name}, ${second.name}`);
  return center;
}

/** Creates a user plus its role profile. Reuses the row when the email exists. */
async function upsertUser(params: {
  email: string;
  name: string;
  role: RoleKey;
  centerId: string | null;
  phone?: string;
  verified?: boolean;
  status?: UserStatus;
  patient?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: Gender;
    bloodGroup?: BloodGroup;
    city?: string;
    allergies?: { substance: string; reaction: string }[];
    conditions?: { name: string }[];
  };
  doctor?: {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    qualification: string;
    specialization: string;
    experienceYears: number;
    consultationFee: number;
    bio: string;
    departmentId?: string | null;
    photoUrl?: string | null;
  };
}) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { key: params.role },
    select: { id: true },
  });

  const existing = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true, patient: { select: { id: true } }, doctor: { select: { id: true } } },
  });

  if (existing) {
    /*
     * Refresh everything the seed owns, including the password.
     *
     * Resetting the hash on re-seed is deliberate and only safe because this is
     * demo data: `DEMO_PASSWORD` has to stay a known credential, otherwise
     * changing it in this file and re-seeding would silently leave every existing
     * account on the old password. Never copy this pattern into a real invite
     * flow, where re-provisioning must not invalidate a live account's password.
     */
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        roleId: role.id,
        healthcareCenterId: params.centerId,
        status: params.status ?? UserStatus.ACTIVE,
        isDeleted: false,
        passwordHash: await hashPassword(DEMO_PASSWORD),
        mustChangePassword: false,
        lockedUntil: null,
        failedLoginCount: 0,
      },
    });
    return { id: existing.id, patientId: existing.patient?.id ?? null, doctorId: existing.doctor?.id ?? null };
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const user = await prisma.user.create({
    data: {
      code: await nextCode("USR"),
      name: params.name,
      email: params.email,
      phone: params.phone ?? null,
      passwordHash,
      status: params.status ?? UserStatus.ACTIVE,
      emailVerified: (params.verified ?? true) ? new Date() : null,
      roleId: role.id,
      healthcareCenterId: params.centerId,
      lastLoginAt: null,
      ...(params.patient
        ? {
            patient: {
              create: {
                code: await nextCode("PT"),
                firstName: params.patient.firstName,
                lastName: params.patient.lastName,
                dateOfBirth: new Date(`${params.patient.dateOfBirth}T00:00:00.000Z`),
                gender: params.patient.gender,
                bloodGroup: params.patient.bloodGroup ?? BloodGroup.UNKNOWN,
                email: params.email,
                phone: params.phone ?? null,
                city: params.patient.city ?? null,
                healthcareCenterId: params.centerId as string,
              },
            },
          }
        : {}),
      ...(params.doctor
        ? {
            doctor: {
              create: {
                code: await nextCode("DOC"),
                licenseNumber: params.doctor.licenseNumber,
                qualification: params.doctor.qualification,
                specialization: params.doctor.specialization,
                experienceYears: params.doctor.experienceYears,
                consultationFee: params.doctor.consultationFee,
                bio: params.doctor.bio,
                departmentId: params.doctor.departmentId ?? null,
                profilePhotoUrl: params.doctor.photoUrl ?? null,
                gender: params.patient?.gender ?? Gender.UNDISCLOSED,
                healthcareCenterId: params.centerId as string,
                ratingAverage: 0,
              },
            },
          }
        : {}),
    },
    select: { id: true, patient: { select: { id: true } }, doctor: { select: { id: true } } },
  });

  // Structured clinical background, added after creation because it needs the
  // patient id.
  if (params.patient && user.patient) {
    const patientId = user.patient.id;

    if (params.patient.allergies?.length) {
      await prisma.patientAllergy.createMany({
        data: params.patient.allergies.map((allergy) => ({
          patientId,
          substance: allergy.substance,
          reaction: allergy.reaction,
        })),
        skipDuplicates: true,
      });
    }

    if (params.patient.conditions?.length) {
      await prisma.patientCondition.createMany({
        data: params.patient.conditions.map((condition) => ({
          patientId,
          name: condition.name,
        })),
        skipDuplicates: true,
      });
    }
  }

  return {
    id: user.id,
    patientId: user.patient?.id ?? null,
    doctorId: user.doctor?.id ?? null,
  };
}

/**
 * Departments (§12).
 *
 * Seeded rather than hardcoded in application code, which is what §12 asks for:
 * the app reads departments from the database, so a centre can add its own.
 */
async function seedDepartments(centerId: string) {
  const catalogue = [
    { code: "GEN", name: "General Medicine", description: "Primary care and general health concerns.", fee: 60 },
    { code: "CAR", name: "Cardiology", description: "Heart and cardiovascular conditions.", fee: 180 },
    { code: "NEU", name: "Neurology", description: "Brain, spine and nervous system conditions.", fee: 200 },
    { code: "DER", name: "Dermatology", description: "Skin, hair and nail conditions.", fee: 120 },
    { code: "PED", name: "Pediatrics", description: "Care for infants, children and adolescents.", fee: 90 },
    { code: "ORT", name: "Orthopedics", description: "Bone, joint and musculoskeletal conditions.", fee: 150 },
    { code: "GYN", name: "Gynecology", description: "Women's reproductive health.", fee: 140 },
    { code: "DEN", name: "Dentistry", description: "Oral health and dental care.", fee: 100 },
    { code: "ENT", name: "ENT", description: "Ear, nose and throat conditions.", fee: 110 },
    { code: "OPH", name: "Ophthalmology", description: "Eye and vision care.", fee: 130 },
  ];

  const ids = new Map<string, string>();

  for (const department of catalogue) {
    const existing = await prisma.department.findFirst({
      where: { healthcareCenterId: centerId, name: department.name },
      select: { id: true },
    });

    if (existing) {
      ids.set(department.code, existing.id);
      continue;
    }

    const created = await prisma.department.create({
      data: {
        code: await nextCode("DEP"),
        name: department.name,
        description: department.description,
        healthcareCenterId: centerId,
        defaultConsultationFee: department.fee,
        status: RecordStatus.ACTIVE,
        sortOrder: catalogue.indexOf(department),
      },
      select: { id: true },
    });

    ids.set(department.code, created.id);
  }

  console.log(`  departments: ${ids.size}`);
  return ids;
}

async function seedMedicines(centerId: string) {
  const catalogue = [
    { name: "Paracetamol", genericName: "Acetaminophen", strength: "500 mg", form: DosageForm.TABLET, price: 1.2, category: "Analgesic", min: 100 },
    { name: "Amoxicillin", genericName: "Amoxicillin", strength: "500 mg", form: DosageForm.CAPSULE, price: 4.5, category: "Antibiotic", min: 50 },
    { name: "Ibuprofen", genericName: "Ibuprofen", strength: "400 mg", form: DosageForm.TABLET, price: 2.1, category: "Anti-inflammatory", min: 80 },
    { name: "Omeprazole", genericName: "Omeprazole", strength: "20 mg", form: DosageForm.CAPSULE, price: 3.8, category: "Antacid", min: 60 },
    { name: "Cetirizine", genericName: "Cetirizine HCl", strength: "10 mg", form: DosageForm.TABLET, price: 1.8, category: "Antihistamine", min: 40 },
    { name: "Metformin", genericName: "Metformin HCl", strength: "500 mg", form: DosageForm.TABLET, price: 2.6, category: "Antidiabetic", min: 70 },
    { name: "Amlodipine", genericName: "Amlodipine", strength: "5 mg", form: DosageForm.TABLET, price: 3.2, category: "Antihypertensive", min: 50 },
    { name: "Salbutamol Inhaler", genericName: "Salbutamol", strength: "100 mcg", form: DosageForm.INHALER, price: 12, category: "Bronchodilator", min: 20 },
    { name: "Metronidazole", genericName: "Metronidazole", strength: "400 mg", form: DosageForm.TABLET, price: 2.9, category: "Antibiotic", min: 45 },
    { name: "Loratadine", genericName: "Loratadine", strength: "10 mg", form: DosageForm.TABLET, price: 1.5, category: "Antihistamine", min: 30 },
    // Deliberately below its minimum, so the low-stock alert has something to show.
    { name: "Insulin (Demo)", genericName: "Insulin Human", strength: "100 IU", form: DosageForm.INJECTION, price: 45, category: "Antidiabetic", min: 25, quantity: 4 },
    // Deliberately expired, so the expiry alert has something to show.
    { name: "Legacy Analgesic (Demo)", genericName: "Phenazone", strength: "500 mg", form: DosageForm.TABLET, price: 1, category: "Analgesic", min: 10, expiresOn: daysAgo(45), quantity: 60 },
  ];

  for (const medicine of catalogue) {
    const existing = await prisma.medicine.findFirst({
      where: { healthcareCenterId: centerId, name: medicine.name, strength: medicine.strength },
      select: { id: true },
    });
    if (existing) continue;

    const created = await prisma.medicine.create({
      data: {
        code: await nextCode("MED"),
        name: medicine.name,
        genericName: medicine.genericName,
        category: medicine.category,
        dosageForm: medicine.form,
        strength: medicine.strength,
        minimumStockLevel: medicine.min,
        unitPrice: medicine.price,
        manufacturer: "Demo Pharmaceuticals Ltd",
        description: `Fictional reference product for development.`,
        status: RecordStatus.ACTIVE,
        healthcareCenterId: centerId,
      },
      select: { id: true, code: true },
    });

    // Opening stock as a single batch, with a matching movement row so the ledger
    // explains the balance from the very first entry.
    const quantity = medicine.quantity ?? 200;
    const batch = await prisma.medicineStock.create({
      data: {
        code: await nextCode("STK"),
        medicineId: created.id,
        healthcareCenterId: centerId,
        batchNumber: `BATCH-${created.code}`,
        quantity,
        unitPrice: medicine.price,
        expiresOn: medicine.expiresOn ?? daysFromNow(365),
        supplier: "Demo Supplier",
      },
      select: { id: true },
    });

    await prisma.stockMovement.create({
      data: {
        code: await nextCode("MOV"),
        stockBatchId: batch.id,
        type: "PURCHASE",
        quantity,
        balanceAfter: quantity,
        reason: "Opening stock (seed)",
        performedAt: NOW,
      },
    });
  }

  console.log(`  medicines: ${catalogue.length}`);
}

/**
 * A test parameter in the seed catalogue. Declared explicitly because the tests
 * below mix quantitative and qualitative parameters; without it TypeScript infers
 * a union per object and `parameter.cLow` errors on the entries that omit it.
 */
type SeedLabParameter = {
  name: string;
  shortName?: string;
  unit?: string;
  low?: number;
  high?: number;
  cLow?: number;
  cHigh?: number;
  lowIsAbnormal?: boolean;
  highIsAbnormal?: boolean;
  qualitative?: boolean;
  decimals?: number;
};

type SeedLabTest = {
  name: string;
  shortName?: string;
  price: number;
  turnaroundHours: number;
  sampleType: string;
  sampleContainer: string;
  requiresFasting?: boolean;
  preparationInstructions?: string;
  parameters: SeedLabParameter[];
};

async function seedLaboratory(centerId: string) {
  const category = await prisma.laboratoryCategory.create({
    data: {
      code: await nextCode("LBC"),
      name: "Hematology",
      description: "Blood cell analysis.",
      healthcareCenterId: centerId,
      status: RecordStatus.ACTIVE,
    },
  }).catch(() =>
    prisma.laboratoryCategory.findFirstOrThrow({
      where: { healthcareCenterId: centerId, name: "Hematology" },
    }),
  );

  const tests: SeedLabTest[] = [
    {
      name: "Complete Blood Count (CBC)",
      shortName: "CBC",
      price: 25,
      turnaroundHours: 24,
      sampleType: "EDTA whole blood",
      sampleContainer: "Purple top tube",
      parameters: [
        { name: "Hemoglobin", shortName: "Hb", unit: "g/dL", low: 12, high: 16, cLow: 7, cHigh: 20, decimals: 1 },
        { name: "White Blood Cell Count", shortName: "WBC", unit: "10^3/uL", low: 4, high: 11, cLow: 1, cHigh: 30, decimals: 2 },
        { name: "Red Blood Cell Count", shortName: "RBC", unit: "10^6/uL", low: 4.5, high: 5.9, decimals: 2 },
        { name: "Platelet Count", shortName: "PLT", unit: "10^3/uL", low: 150, high: 410, cLow: 30, cHigh: 1000, decimals: 0 },
        { name: "Hematocrit", shortName: "Hct", unit: "%", low: 36, high: 46, decimals: 1 },
      ],
    },
    {
      name: "Glucose, Fasting",
      shortName: "FBS",
      price: 8,
      turnaroundHours: 8,
      sampleType: "Serum",
      sampleContainer: "Red top tube",
      requiresFasting: true,
      preparationInstructions: "Fast for at least 8 hours before the blood draw.",
      parameters: [
        { name: "Glucose", unit: "mg/dL", low: 70, high: 99, cLow: 50, cHigh: 400, decimals: 1 },
      ],
    },
    {
      name: "Lipid Profile",
      shortName: "LIPID",
      price: 30,
      turnaroundHours: 24,
      sampleType: "Serum",
      sampleContainer: "Red top tube",
      requiresFasting: true,
      parameters: [
        { name: "Total Cholesterol", unit: "mg/dL", low: 0, high: 200, decimals: 1 },
        { name: "Triglycerides", unit: "mg/dL", low: 0, high: 150, decimals: 1 },
        { name: "HDL Cholesterol", unit: "mg/dL", low: 40, high: 100, lowIsAbnormal: true, highIsAbnormal: false, decimals: 1 },
        { name: "LDL Cholesterol", unit: "mg/dL", low: 0, high: 130, decimals: 1 },
      ],
    },
    {
      name: "Urinalysis",
      shortName: "UA",
      price: 12,
      turnaroundHours: 12,
      sampleType: "Urine",
      sampleContainer: "Sterile container",
      parameters: [
        { name: "Color", qualitative: true },
        { name: "Albumin", unit: "mg/dL", low: 0, high: 20, decimals: 0 },
        { name: "Glucose", unit: "mg/dL", low: 0, high: 0, decimals: 0 },
        { name: "Pus Cells", unit: "/HPF", low: 0, high: 5, decimals: 0 },
      ],
    },
    {
      name: "Urine Pregnancy Test",
      shortName: "PT",
      price: 10,
      turnaroundHours: 4,
      sampleType: "Urine",
      sampleContainer: "Sterile container",
      parameters: [
        { name: "hCG", qualitative: true },
      ],
    },
  ];

  for (const test of tests) {
    const existing = await prisma.laboratoryTest.findFirst({
      where: { healthcareCenterId: centerId, name: test.name },
      select: { id: true },
    });
    if (existing) continue;

    const parameterRows: (SeedLabParameter & { code: string })[] = [];
    for (const parameter of test.parameters) {
      parameterRows.push({ ...parameter, code: await nextCode("PRM") });
    }

    await prisma.laboratoryTest.create({
      data: {
        code: await nextCode("LAB"),
        name: test.name,
        shortName: test.shortName,
        description: `${test.name} — fictional reference test for development.`,
        healthcareCenterId: centerId,
        categoryId: category.id,
        price: test.price,
        turnaroundHours: test.turnaroundHours,
        sampleType: test.sampleType,
        sampleContainer: test.sampleContainer,
        requiresFasting: test.requiresFasting ?? false,
        preparationInstructions: test.preparationInstructions ?? null,
        method: "Automated analyzer",
        status: RecordStatus.ACTIVE,
        parameters: {
          create: parameterRows.map((parameter, index) => ({
            code: parameter.code,
            name: parameter.name,
            shortName: parameter.shortName ?? null,
            unit: parameter.unit ?? null,
            referenceRangeLow: parameter.low ?? null,
            referenceRangeHigh: parameter.high ?? null,
            referenceRangeText:
              parameter.low !== undefined && parameter.high !== undefined
                ? `${parameter.low} - ${parameter.high}`
                : null,
            criticalRangeLow: parameter.cLow ?? null,
            criticalRangeHigh: parameter.cHigh ?? null,
            lowIsAbnormal: parameter.lowIsAbnormal ?? true,
            highIsAbnormal: parameter.highIsAbnormal ?? true,
            isQualitative: parameter.qualitative ?? false,
            decimalPlaces: parameter.decimals ?? null,
            sortOrder: index,
          })),
        },
      },
    });
  }

  console.log(`  lab: 1 category, ${tests.length} tests`);
}

async function seedServices(centerId: string) {
  const catalogue = [
    { name: "General Consultation", category: "CONSULTATION", price: 60, duration: 15 },
    { name: "Follow-up Consultation", category: "CONSULTATION", price: 30, duration: 10 },
    { name: "ECG", category: "DIAGNOSTICS", price: 20, duration: 15 },
    { name: "X-Ray", category: "DIAGNOSTICS", price: 45, duration: 20 },
    { name: "Ultrasound", category: "DIAGNOSTICS", price: 60, duration: 30 },
    { name: "Blood Test (CBC)", category: "DIAGNOSTICS", price: 25, duration: 10, requiresDoctorOrder: true },
    { name: "Dental Cleaning", category: "PROCEDURE", price: 70, duration: 45 },
    { name: "Physiotherapy Session", category: "PROCEDURE", price: 55, duration: 40 },
  ];

  for (const service of catalogue) {
    const existing = await prisma.service.findFirst({
      where: { healthcareCenterId: centerId, name: service.name },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.service.create({
      data: {
        code: await nextCode("SRV"),
        name: service.name,
        description: `${service.name} — fictional reference service for development.`,
        category: service.category,
        price: service.price,
        durationMinutes: service.duration,
        requiresDoctorOrder: service.requiresDoctorOrder ?? false,
        isBookable: true,
        status: RecordStatus.ACTIVE,
        healthcareCenterId: centerId,
      },
    });
  }

  console.log(`  services: ${catalogue.length}`);
}

/**
 * Clinical demo data: appointments, a consultation, a prescription, a lab result,
 * an invoice and a payment.
 *
 * Written against future dates so the dashboards and reminder views have
 * something to show, and against past dates so history exists too.
 */
async function seedClinicalData(params: {
  centerId: string;
  doctors: { id: string; userId: string }[];
  patients: { id: string; userId: string }[];
  departments: Map<string, string>;
}) {
  const { centerId, doctors, patients, departments } = params;

  // ── Doctors' weekly rotas ────────────────────────────────────────────────
  // Monday–Saturday mornings and evenings, so the slot engine has real blocks.
  const rota: { day: string; start: string; end: string; brkStart: string; brkEnd: string }[] = [
    { day: "MONDAY", start: "09:00", end: "17:00", brkStart: "13:00", brkEnd: "14:00" },
    { day: "TUESDAY", start: "09:00", end: "17:00", brkStart: "13:00", brkEnd: "14:00" },
    { day: "WEDNESDAY", start: "09:00", end: "13:00", brkStart: "", brkEnd: "" },
    { day: "THURSDAY", start: "09:00", end: "17:00", brkStart: "13:00", brkEnd: "14:00" },
    { day: "FRIDAY", start: "09:00", end: "13:00", brkStart: "", brkEnd: "" },
    { day: "SATURDAY", start: "10:00", end: "14:00", brkStart: "", brkEnd: "" },
  ];

  for (const doctor of doctors) {
    const count = await prisma.doctorSchedule.count({
      where: { doctorId: doctor.id, isActive: true },
    });
    if (count > 0) continue;

    /*
     * Codes come from the shared counter rather than being derived from the loop
     * index: this block runs once per doctor, so an index-based code collides on
     * the second doctor. Built with a plain loop instead of createMany because
     * nextCode is async and `.map()` cannot await.
     */
    const blocks: (typeof rota[number] & { code: string })[] = [];
    for (const block of rota) {
      blocks.push({ ...block, code: await nextCode("SCH") });
    }

    await prisma.doctorSchedule.createMany({
      data: blocks.map((block) => ({
        code: block.code,
        doctorId: doctor.id,
        healthcareCenterId: centerId,
        dayOfWeek: block.day as never,
        startTime: block.start,
        endTime: block.end,
        breakStartTime: block.brkStart || null,
        breakEndTime: block.brkEnd || null,
        slotDurationMinutes: 20,
        isActive: true,
      })),
    });
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  const past = [
    { patientIndex: 0, doctorIndex: 0, daysAgo: 21, status: AppointmentStatus.COMPLETED, reason: "Recurring tension headaches" },
    { patientIndex: 1, doctorIndex: 1, daysAgo: 14, status: AppointmentStatus.COMPLETED, reason: "Follow-up on blood pressure" },
    { patientIndex: 2, doctorIndex: 2, daysAgo: 7, status: AppointmentStatus.COMPLETED, reason: "Skin rash on forearm" },
  ];

  const upcoming = [
    { patientIndex: 0, doctorIndex: 1, daysAgo: 1, status: AppointmentStatus.CONFIRMED, reason: "Blood pressure review" },
    { patientIndex: 1, doctorIndex: 0, daysAgo: 2, status: AppointmentStatus.CONFIRMED, reason: "Medication review" },
    { patientIndex: 3, doctorIndex: 2, daysAgo: 3, status: AppointmentStatus.PENDING, reason: "Itchy skin, two weeks" },
    { patientIndex: 4, doctorIndex: 3, daysAgo: -5, status: AppointmentStatus.PENDING, reason: "Annual check-up" },
    { patientIndex: 2, doctorIndex: 0, daysAgo: -6, status: AppointmentStatus.PENDING, reason: "Cough for two weeks" },
  ];

  const createdAppointments: { id: string; patientId: string; doctorId: string; startAt: Date; completed: boolean }[] = [];

  for (const entry of [...past, ...upcoming]) {
    const patient = patients[entry.patientIndex % patients.length];
    const doctor = doctors[entry.doctorIndex % doctors.length];
    if (!patient || !doctor) continue;

    const startAt = daysFromNow(entry.daysAgo, 9 + (entry.patientIndex % 6));
    const endAt = new Date(startAt.getTime() + 20 * 60 * 1000);

    /*
     * Find-or-create rather than create-or-skip.
     *
     * Returning the row either way is what makes the seed genuinely idempotent:
     * the downstream steps (records, prescriptions, lab results, invoices,
     * reviews) are driven off this list, so a version that pushed only newly
     * created rows would leave them permanently unseeded on every re-run.
     *
     * The lookup key is (doctor, startAt) rather than the generated
     * `appointmentNumber`. `nextYearCode` advances a counter on every call, so the
     * number differs on each run and matching on it would re-insert every
     * appointment — which then fails the overlap exclusion constraint. The doctor
     * and start time are what actually identify the slot, and the constraint is
     * still there as the backstop.
     */
    const existing = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id, startAt },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        startAt: true,
        status: true,
      },
    });

    const appointment = existing
      ? existing
      : await prisma.appointment.create({
          data: {
            appointmentNumber: await nextYearCode("APT", startAt),
            healthcareCenterId: centerId,
            patientId: patient.id,
            doctorId: doctor.id,
            departmentId: departments.get("GEN") ?? null,
            startAt,
            endAt,
            type: AppointmentType.IN_PERSON,
            status: entry.status,
            reason: entry.reason,
            paymentStatus: "UNPAID",
            bookedByUserId: patient.userId,
            checkedInAt: entry.status === AppointmentStatus.COMPLETED ? startAt : null,
            startedAt: entry.status === AppointmentStatus.COMPLETED ? startAt : null,
            completedAt: entry.status === AppointmentStatus.COMPLETED ? endAt : null,
          },
          select: { id: true, patientId: true, doctorId: true, startAt: true, status: true },
        });

    createdAppointments.push({
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      startAt: appointment.startAt,
      completed: entry.status === AppointmentStatus.COMPLETED,
    });
  }

  console.log(`  appointments: ${createdAppointments.length}`);

  // ── Consultation records for the completed visits ──────────────────────────
  let records = 0;
  for (const appointment of createdAppointments.filter((a) => a.completed)) {
    const recordExists = await prisma.medicalRecord.findFirst({
      where: { appointmentId: appointment.id },
      select: { id: true },
    });
    if (recordExists) continue;

    const record = await prisma.medicalRecord.create({
      data: {
        code: await nextCode("REC"),
        healthcareCenterId: centerId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentId: appointment.id,
        visitDate: appointment.startAt,
        chiefComplaint: "Follow-up consultation",
        symptoms: "Patient reports improvement since the previous visit.",
        examination: "General examination unremarkable. Vitals within expected range.",
        treatmentPlan: "Continue current medication. Review in four weeks.",
        clinicalNotes:
          "Fictional clinical note created by the seed script. Not real medical advice.",
        adviceGiven: "Maintain hydration and regular sleep.",
        vitals: {
          create: [
            {
              code: await nextCode("VIT"),
              bloodPressureSystolic: "122",
              bloodPressureDiastolic: "78",
              heartRate: "72",
              temperature: "36.8",
              respiratoryRate: "16",
              oxygenSaturation: "98",
              weight: "70",
              height: "172",
              bmi: 23.7,
              isAbnormal: false,
              measuredAt: appointment.startAt,
            },
          ],
        },
        diagnoses: {
          create: [
            {
              code: await nextCode("DIA"),
              healthcareCenterId: centerId,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              type: "PRIMARY",
              description: "Essential hypertension (fictional demo diagnosis)",
              icd10Code: "I10",
              diagnosedAt: appointment.startAt,
            },
          ],
        },
      },
      select: { id: true },
    });

    // A prescription against the same record.
    const paracetamol = await prisma.medicine.findFirst({
      where: { healthcareCenterId: centerId, name: "Paracetamol" },
      select: { id: true, unitPrice: true },
    });

    await prisma.prescription.create({
      data: {
        code: await nextCode("RX"),
        healthcareCenterId: centerId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        medicalRecordId: record.id,
        appointmentId: appointment.id,
        status: "ISSUED",
        diagnosisSummary: "Essential hypertension (fictional demo diagnosis)",
        instructions: "Take after food.",
        generalAdvice: "Reduce salt intake and exercise regularly.",
        followUpDate: daysFromNow(28),
        prescribedAt: appointment.startAt,
        issuedAt: appointment.startAt,
        items: {
          create: [
            {
              code: await nextCode("RXI"),
              medicineId: paracetamol?.id ?? null,
              medicineName: "Paracetamol",
              dosage: "500 mg",
              frequency: "THREE_TIMES_DAILY",
              duration: "5 days",
              route: "ORAL",
              quantity: 15,
              instructions: "Take after food.",
              sortOrder: 0,
            },
            {
              code: await nextCode("RXI"),
              medicineId: null,
              medicineName: "Amlodipine",
              dosage: "5 mg",
              frequency: "ONCE_DAILY",
              duration: "30 days",
              route: "ORAL",
              quantity: 30,
              instructions: "Take in the morning.",
              sortOrder: 1,
            },
          ],
        },
      },
    });

    records += 1;
  }

  console.log(`  medical records + prescriptions: ${records}`);

  // ── Lab request with a published result ───────────────────────────────────
  const firstCompleted = createdAppointments.find((a) => a.completed);
  const cbc = await prisma.laboratoryTest.findFirst({
    where: { healthcareCenterId: centerId, shortName: "CBC" },
    include: { parameters: { orderBy: { sortOrder: "asc" } } },
  });

  if (firstCompleted && cbc) {
    const requestExists = await prisma.labRequest.findFirst({
      where: { patientId: firstCompleted.patientId, status: "COMPLETED" },
      select: { id: true },
    });

    if (!requestExists) {
      const request = await prisma.labRequest.create({
        data: {
          code: await nextCode("LREQ"),
          healthcareCenterId: centerId,
          patientId: firstCompleted.patientId,
          doctorId: firstCompleted.doctorId,
          medicalRecordId: null,
          status: LabRequestStatus.COMPLETED,
          priority: LabPriority.ROUTINE,
          provisionalDiagnosis: "Routine health check (fictional demo)",
          clinicalNotes: "Routine screening requested at follow-up.",
          requestedAt: daysAgo(10),
          sampleCollectedAt: daysAgo(9),
          processingStartedAt: daysAgo(9),
          completedAt: daysAgo(9),
          items: {
            create: [
              {
                code: await nextCode("LRI"),
                testId: cbc.id,
                price: cbc.price,
                status: LabRequestStatus.COMPLETED,
                isBilled: true,
                completedAt: daysAgo(9),
              },
            ],
          },
        },
        select: { id: true },
      });

      // Deliberately mixed normal and abnormal values, so the report demonstrates
      // the abnormal-flag rendering.
      const readings: Record<string, number> = {
        Hemoglobin: 14.2,
        "White Blood Cell Count": 12.4,
        "Red Blood Cell Count": 4.8,
        "Platelet Count": 180,
        Hematocrit: 43,
      };

      // Real counters for the value rows, generated up front because the nested
      // create below uses a synchronous .map().
      const valueRows: { code: string }[] = [];
      for (let i = 0; i < cbc.parameters.length; i += 1) {
        valueRows.push({ code: await nextCode("LRV") });
      }

      const result = await prisma.labResult.create({
        data: {
          code: await nextCode("LRS"),
          healthcareCenterId: centerId,
          labRequestId: request.id,
          patientId: firstCompleted.patientId,
          testId: cbc.id,
          performedByName: "Demo Lab Technician",
          verifiedByName: "Demo Lab Technologist",
          verifiedAt: daysAgo(9),
          overallStatus: "HIGH",
          summary:
            "Fictional sample report generated by the seed script. WBC mildly elevated.",
          reportedAt: daysAgo(9),
          values: {
            create: cbc.parameters.map((parameter, index) => {
              const value = readings[parameter.name] ?? parameter.referenceRangeLow
                ? readings[parameter.name] ?? 0
                : 0;
              const low = parameter.referenceRangeLow?.toNumber() ?? null;
              const high = parameter.referenceRangeHigh?.toNumber() ?? null;

              let flag: "NONE" | "LOW" | "HIGH" | "CRITICAL_LOW" | "CRITICAL_HIGH" = "NONE";
              if (parameter.isQualitative) {
                flag = "NONE";
              } else if (low !== null && value < low) {
                flag =
                  parameter.criticalRangeLow && value < parameter.criticalRangeLow.toNumber()
                    ? "CRITICAL_LOW"
                    : "LOW";
              } else if (high !== null && value > high) {
                flag =
                  parameter.criticalRangeHigh && value > parameter.criticalRangeHigh.toNumber()
                    ? "CRITICAL_HIGH"
                    : "HIGH";
              }

              return {
                code: valueRows[index]!.code,
                parameterId: parameter.id,
                parameterName: parameter.name,
                resultValue: parameter.isQualitative ? null : value,
                unit: parameter.unit,
                referenceRangeText: parameter.referenceRangeText,
                abnormalFlag: flag,
                sortOrder: index,
              };
            }),
          },
        },
        select: { id: true },
      });

      console.log(`  lab request + result: ${result.id}`);
    }
  }

  // ── An invoice, partly paid ───────────────────────────────────────────────
  const billable = createdAppointments[0];
  if (billable) {
    const invoiceExists = await prisma.invoice.findFirst({
      where: { patientId: billable.patientId },
      select: { id: true },
    });

    if (!invoiceExists) {
      const consultation = await prisma.service.findFirst({
        where: { healthcareCenterId: centerId, name: "General Consultation" },
        select: { id: true, price: true },
      });

      const lineTotal = Number(consultation?.price ?? 60);
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: await nextYearCode("INV", NOW),
          healthcareCenterId: centerId,
          patientId: billable.patientId,
          appointmentId: billable.id,
          doctorId: billable.doctorId,
          status: "ISSUED",
          currency: "USD",
          issuedAt: daysAgo(20),
          dueAt: daysAgo(6),
          subtotalAmount: lineTotal,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          totalAmount: lineTotal,
          // Deliberately partial, so outstanding-balance tiles are non-zero.
          paidAmount: lineTotal / 2,
          dueAmount: lineTotal / 2,
          notes: "Fictional demo invoice.",
          items: {
            create: [
              {
                code: await nextCode("INI"),
                serviceId: consultation?.id ?? null,
                description: "General Consultation",
                quantity: 1,
                unitPrice: lineTotal,
                lineTotal,
                taxPercent: 0,
                taxAmount: 0,
                sortOrder: 0,
              },
            ],
          },
        },
        select: { id: true, totalAmount: true, paidAmount: true },
      });

      await prisma.payment.create({
        data: {
          paymentNumber: await nextYearCode("PAY", NOW),
          healthcareCenterId: centerId,
          invoiceId: invoice.id,
          patientId: billable.patientId,
          amount: Number(invoice.paidAmount),
          currency: "USD",
          method: "CARD",
          status: "COMPLETED",
          cardLast4: "4242",
          transactionId: "DEMO-TXN-0001",
          paidAt: daysAgo(19),
          notes: "Fictional demo payment.",
        },
      });

      console.log(`  invoice + payment: ${invoice.id}`);
    }
  }

  // ── A published review ────────────────────────────────────────────────────
  const reviewed = createdAppointments.find((a) => a.completed);
  if (reviewed) {
    /*
     * findFirst rather than findUnique: this is an existence check, and the
     * generated name for the one-review-per-appointment constraint differs between
     * the constraint's `name:` and the field, so a unique lookup here is brittle.
     * The unique index still enforces the rule on write.
     */
    const reviewExists = await prisma.review.findFirst({
      where: { appointmentId: reviewed.id },
      select: { id: true },
    });

    if (!reviewExists) {
      const rating = 4;
      await prisma.review.create({
        data: {
          code: await nextCode("REV"),
          healthcareCenterId: centerId,
          patientId: reviewed.patientId,
          doctorId: reviewed.doctorId,
          appointmentId: reviewed.id,
          rating,
          comment:
            "Fictional demo review. The consultation was thorough and the explanation was clear.",
          status: "PUBLISHED",
        },
      });

      // Recompute the doctor's cached rating the way the review service does.
      const aggregate = await prisma.review.aggregate({
        where: { doctorId: reviewed.doctorId, status: "PUBLISHED" },
        _avg: { rating: true },
        _count: true,
      });

      await prisma.doctor.update({
        where: { id: reviewed.doctorId },
        data: {
          ratingAverage: aggregate._avg.rating ?? 0,
          ratingCount: aggregate._count,
        },
      });

      console.log(`  review: 1`);
    }
  }

  // ── Notifications for the first patient ──────────────────────────────────
  if (patients[0]) {
    await prisma.notification.createMany({
      data: [
        {
          code: await nextCode("NTF"),
          userId: patients[0].userId,
          healthcareCenterId: centerId,
          type: "APPOINTMENT_CONFIRMATION",
          channel: "IN_APP",
          title: "Appointment confirmed",
          body: "Your appointment has been confirmed.",
          actionUrl: "/dashboard/patient/appointments",
          metadata: { seeded: true },
        },
        {
          code: await nextCode("NTF"),
          userId: patients[0].userId,
          healthcareCenterId: centerId,
          type: "LAB_REPORT_AVAILABLE",
          channel: "IN_APP",
          title: "Lab report available",
          body: "Your Complete Blood Count report is ready to view.",
          actionUrl: "/dashboard/patient/laboratory",
          metadata: { seeded: true },
        },
        {
          code: await nextCode("NTF"),
          userId: patients[0].userId,
          healthcareCenterId: centerId,
          type: "PAYMENT_REMINDER",
          channel: "IN_APP",
          title: "Payment due",
          body: "You have an outstanding balance on a recent invoice.",
          actionUrl: "/dashboard/patient/invoices",
          readAt: null,
          metadata: { seeded: true },
        },
      ],
      skipDuplicates: true,
    });
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log("\nSeeding PH Healthcare demo data…\n");

  await seedRbac();
  const center = await seedCenter();

  const departments = await seedDepartments(center.id);
  await seedMedicines(center.id);
  await seedLaboratory(center.id);
  await seedServices(center.id);

  // ── Accounts ────────────────────────────────────────────────────────────
  await upsertUser({
    email: "superadmin@demo.example",
    name: "Demo Super Admin",
    role: RoleKey.SUPERADMIN,
    centerId: null,
    phone: "+8801700000001",
  });

  await upsertUser({
    email: "admin@demo.example",
    name: "Demo Administrator",
    role: RoleKey.ADMIN,
    centerId: center.id,
    phone: "+8801700000002",
  });

  const doctors: { id: string; userId: string }[] = [];
  const doctorSeed = [
    { email: "doctor@demo.example", name: "Dr. Demo Ahmed", dept: "GEN", license: "DEMO-LIC-0001", qualification: "MBBS, FCPS (Medicine)", specialization: "Internal Medicine", years: 12, fee: 60, bio: "Fictional physician profile for development." },
    { email: "dr.rahman@demo.example", name: "Dr. Demo Rahman", dept: "CAR", license: "DEMO-LIC-0002", qualification: "MBBS, D-Card, MD (Cardiology)", specialization: "Interventional Cardiology", years: 15, fee: 180, bio: "Fictional physician profile for development." },
    { email: "dr.singh@demo.example", name: "Dr. Demo Singh", dept: "DER", license: "DEMO-LIC-0003", qualification: "MBBS, DDV (Dermatology)", specialization: "Clinical Dermatology", years: 8, fee: 120, bio: "Fictional physician profile for development." },
    { email: "dr.akter@demo.example", name: "Dr. Demo Akter", dept: "PED", license: "DEMO-LIC-0004", qualification: "MBBS, DCH (Pediatrics)", specialization: "General Pediatrics", years: 6, fee: 90, bio: "Fictional physician profile for development." },
  ];

  for (const doctor of doctorSeed) {
    const account = await upsertUser({
      email: doctor.email,
      name: doctor.name,
      role: RoleKey.DOCTOR,
      centerId: center.id,
      phone: "+8801700000010",
      doctor: {
        firstName: doctor.name.replace(/^Dr\.\s*/, "").split(" ").slice(0, -1).join(" ") || "Demo",
        lastName: doctor.name.split(" ").pop() ?? "Doctor",
        licenseNumber: doctor.license,
        qualification: doctor.qualification,
        specialization: doctor.specialization,
        experienceYears: doctor.years,
        consultationFee: doctor.fee,
        bio: doctor.bio,
        departmentId: departments.get(doctor.dept) ?? null,
      },
    });

    if (account.doctorId) {
      doctors.push({ id: account.doctorId, userId: account.id });
    }
  }

  const staff = await upsertUser({
    email: "staff@demo.example",
    name: "Demo Receptionist",
    role: RoleKey.ADMIN,
    centerId: center.id,
    phone: "+8801700000020",
  });

  // Staff profile for the admin-role user, so the staff module has a row.
  if (staff.id) {
    const existingStaff = await prisma.staff.findFirst({
      where: { userId: staff.id },
      select: { id: true },
    });

    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          code: await nextCode("STF"),
          userId: staff.id,
          healthcareCenterId: center.id,
          designation: "Receptionist",
          responsibilities: ["Front desk", "Appointment scheduling"],
          joinedAt: daysAgo(200),
          status: RecordStatus.ACTIVE,
        },
      });
    }
  }

  const patients: { id: string; userId: string }[] = [];
  const patientSeed = [
    { email: "patient@demo.example", first: "Demo", last: "Patient", dob: "1990-05-21", gender: Gender.FEMALE, blood: BloodGroup.A_POSITIVE, city: "Dhaka", allergies: [{ substance: "Penicillin", reaction: "Rash" }], conditions: [{ name: "Hypertension" }] },
    { email: "patient2@demo.example", first: "Demo", last: "Hasan", dob: "1978-11-02", gender: Gender.MALE, blood: BloodGroup.O_POSITIVE, city: "Dhaka", allergies: [], conditions: [{ name: "Type 2 Diabetes" }] },
    { email: "patient3@demo.example", first: "Demo", last: "Khatun", dob: "2001-03-14", gender: Gender.FEMALE, blood: BloodGroup.B_NEGATIVE, city: "Chattogram", allergies: [{ substance: "Sulfa drugs", reaction: "Hives" }], conditions: [] },
    { email: "patient4@demo.example", first: "Demo", last: "Islam", dob: "2015-08-30", gender: Gender.MALE, blood: BloodGroup.UNKNOWN, city: "Sylhet", allergies: [], conditions: [] },
    { email: "patient5@demo.example", first: "Demo", last: "Chowdhury", dob: "1965-01-25", gender: Gender.FEMALE, blood: BloodGroup.AB_POSITIVE, city: "Rajshahi", allergies: [], conditions: [{ name: "Asthma" }] },
  ];

  for (const patient of patientSeed) {
    const account = await upsertUser({
      email: patient.email,
      name: `${patient.first} ${patient.last}`,
      role: RoleKey.PATIENT,
      centerId: center.id,
      phone: "+8801800000000",
      patient: {
        firstName: patient.first,
        lastName: patient.last,
        dateOfBirth: patient.dob,
        gender: patient.gender,
        bloodGroup: patient.blood,
        city: patient.city,
        allergies: patient.allergies,
        conditions: patient.conditions,
      },
    });

    if (account.patientId) {
      patients.push({ id: account.patientId, userId: account.id });
    }
  }

  // One unverified patient, so the email-verification path has a subject.
  await upsertUser({
    email: "patient.pending@demo.example",
    name: "Demo Unverified",
    role: RoleKey.PATIENT,
    centerId: center.id,
    status: UserStatus.PENDING_VERIFICATION,
    verified: false,
    patient: {
      firstName: "Demo",
      lastName: "Unverified",
      dateOfBirth: "1995-01-01",
      gender: Gender.UNDISCLOSED,
    },
  });

  console.log(`  users: superadmin + 1 admin + 1 staff + ${doctors.length} doctors + ${patients.length + 1} patients`);

  await seedClinicalData({ centerId: center.id, doctors, patients, departments });

  console.log("\nSeed complete.\n");
  console.log("  Demo sign-in (password for every account: Demo@12345)");
  console.log("  ─────────────────────────────────────────────────────");
  console.log("  SUPERADMIN  superadmin@demo.example");
  console.log("  ADMIN       admin@demo.example");
  console.log("  DOCTOR      doctor@demo.example");
  console.log("  PATIENT     patient@demo.example");
  console.log("  unverified  patient.pending@demo.example  (login blocked, email not verified)\n");

  // Cross-tenant check: nothing from the second center may be referenced above.
  const stray = await prisma.appointment.count({
    where: { patientId: { notIn: patients.map((p) => p.id) }, healthcareCenterId: center.id },
  });
  if (stray > 0) {
    console.warn(`  ⚠ ${stray} appointment(s) reference a patient outside this center.`);
  }
}

main()
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });