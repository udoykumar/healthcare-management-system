-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('SUPERADMIN', 'ADMIN', 'DOCTOR', 'PATIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContactRelationship" AS ENUM ('SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'FRIEND', 'COLLEAGUE', 'CAREGIVER', 'OTHER');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'ONLINE', 'FOLLOW_UP', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('PATIENT_REQUEST', 'DOCTOR_UNAVAILABLE', 'CENTER_CLOSED', 'NO_SHOW', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('NOT_REQUIRED', 'UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'ANNUAL', 'UNPAID', 'CONFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('PRIMARY', 'SECONDARY', 'DIFFERENTIAL', 'COMPLICATION');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'IV', 'IM', 'SUBCUTANEOUS', 'TOPICAL', 'INHALATION', 'RECTAL', 'OPHTHALMIC', 'OTIC', 'TRANSDERMAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationFrequency" AS ENUM ('ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_4_HOURS', 'EVERY_6_HOURS', 'EVERY_8_HOURS', 'AS_NEEDED', 'AT_BEDTIME', 'BEFORE_MEALS', 'AFTER_MEALS', 'WITH_MEALS', 'OTHER');

-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'PATCH', 'SUPPOSITORY', 'OTHER');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabRequestStatus" AS ENUM ('REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "AbnormalFlag" AS ENUM ('NONE', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'ONLINE_PAYMENT', 'INSURANCE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'APPOINTMENT_CANCELLATION', 'APPOINTMENT_RESCHEDULED', 'PRESCRIPTION_AVAILABLE', 'LAB_REPORT_AVAILABLE', 'PAYMENT_REMINDER', 'PAYMENT_RECEIPT', 'ACCOUNT_VERIFICATION', 'PASSWORD_RESET', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('MEDICAL_REPORT', 'PRESCRIPTION', 'LAB_REPORT', 'INSURANCE', 'IDENTITY', 'REFERRAL', 'CONSENT_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'EMAIL_VERIFIED', 'USER_CREATED', 'USER_UPDATED', 'USER_ROLE_CHANGED', 'USER_STATUS_CHANGED', 'USER_DELETED', 'CENTER_CREATED', 'CENTER_UPDATED', 'CENTER_STATUS_CHANGED', 'PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_DELETED', 'DOCTOR_CREATED', 'DOCTOR_UPDATED', 'DOCTOR_STATUS_CHANGED', 'STAFF_CREATED', 'STAFF_UPDATED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED', 'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_STATUS_CHANGED', 'SCHEDULE_UPDATED', 'LEAVE_CREATED', 'MEDICAL_RECORD_CREATED', 'MEDICAL_RECORD_UPDATED', 'DIAGNOSIS_CREATED', 'PRESCRIPTION_CREATED', 'MEDICINE_CREATED', 'MEDICINE_UPDATED', 'MEDICINE_STOCK_ADJUSTED', 'LAB_TEST_CREATED', 'LAB_TEST_UPDATED', 'LAB_REQUEST_CREATED', 'LAB_RESULT_CREATED', 'SERVICE_CREATED', 'SERVICE_UPDATED', 'INVOICE_CREATED', 'INVOICE_UPDATED', 'PAYMENT_CREATED', 'PAYMENT_REFUNDED', 'REVIEW_CREATED', 'REVIEW_MODERATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'SETTINGS_UPDATED', 'PERMISSION_CHANGED', 'ACCESS_DENIED');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'INVITATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "roleId" TEXT,
    "healthcareCenterId" TEXT,
    "lastLoginCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "healthcareCenterId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "requiresDoctorOrder" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "doctorId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms" TEXT,
    "sourceLabRequestId" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceId" TEXT,
    "medicineId" TEXT,
    "labRequestItemId" TEXT,
    "description" TEXT NOT NULL,
    "detail" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "cardLast4" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "symptoms" TEXT,
    "examination" TEXT,
    "treatmentPlan" TEXT,
    "clinicalNotes" TEXT,
    "adviceGiven" TEXT,
    "followUpDate" TIMESTAMP(3),
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloodPressureSystolic" TEXT,
    "bloodPressureDiastolic" TEXT,
    "heartRate" TEXT,
    "temperature" TEXT,
    "respiratoryRate" TEXT,
    "oxygenSaturation" TEXT,
    "weight" TEXT,
    "height" TEXT,
    "bmi" DECIMAL(5,2),
    "notes" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "type" "DiagnosisType" NOT NULL DEFAULT 'PRIMARY',
    "description" TEXT NOT NULL,
    "icd10Code" TEXT,
    "notes" TEXT,
    "isSuperseded" BOOLEAN NOT NULL DEFAULT false,
    "supersededById" TEXT,
    "diagnosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "brandName" TEXT,
    "category" TEXT,
    "manufacturer" TEXT,
    "description" TEXT,
    "dosageForm" "DosageForm" NOT NULL DEFAULT 'TABLET',
    "strength" TEXT,
    "minimumStockLevel" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPrescribable" BOOLEAN NOT NULL DEFAULT true,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT true,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_stock" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "batchNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expiresOn" TIMESTAMP(3),
    "unitPrice" DECIMAL(12,2),
    "supplier" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "diagnosisSummary" TEXT,
    "instructions" TEXT,
    "generalAdvice" TEXT,
    "followUpDate" TIMESTAMP(3),
    "prescribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" "MedicationFrequency" NOT NULL,
    "frequencyText" TEXT,
    "duration" TEXT NOT NULL,
    "route" "MedicationRoute" NOT NULL DEFAULT 'ORAL',
    "instructions" TEXT,
    "quantity" INTEGER,
    "dispensedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "actionUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "emailError" TEXT,
    "dedupeKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageBucket" TEXT,
    "patientIdForUpload" TEXT,
    "uploadedById" TEXT,
    "appointmentId" TEXT,
    "medicalRecordId" TEXT,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "healthcareCenterId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "succeeded" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "healthcareCenterId" TEXT,
    "value" TEXT NOT NULL,
    "valueType" "SettingValueType" NOT NULL DEFAULT 'STRING',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "isSystemKey" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "healthcareCenterId" TEXT NOT NULL,
    "departmentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratory_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_tests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "healthcareCenterId" TEXT NOT NULL,
    "categoryId" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "turnaroundHours" INTEGER NOT NULL DEFAULT 24,
    "sampleType" TEXT,
    "sampleContainer" TEXT,
    "preparationInstructions" TEXT,
    "requiresFasting" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratory_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_parameters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "unit" TEXT,
    "referenceRangeLow" DECIMAL(12,4),
    "referenceRangeHigh" DECIMAL(12,4),
    "referenceRangeText" TEXT,
    "criticalRangeLow" DECIMAL(12,4),
    "criticalRangeHigh" DECIMAL(12,4),
    "lowIsAbnormal" BOOLEAN NOT NULL DEFAULT true,
    "highIsAbnormal" BOOLEAN NOT NULL DEFAULT true,
    "isQualitative" BOOLEAN NOT NULL DEFAULT false,
    "decimalPlaces" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "medicalRecordId" TEXT,
    "appointmentId" TEXT,
    "status" "LabRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "priority" "LabPriority" NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" TEXT,
    "provisionalDiagnosis" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleCollectedAt" TIMESTAMP(3),
    "sampleCollectedBy" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_request_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labRequestId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "status" "LabRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "labRequestId" TEXT NOT NULL,
    "labRequestItemId" TEXT,
    "patientId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "performedById" TEXT,
    "performedByName" TEXT,
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "overallStatus" "AbnormalFlag" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "summary" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_result_values" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "resultValue" DECIMAL(12,4),
    "resultText" TEXT,
    "unit" TEXT,
    "referenceRangeText" TEXT,
    "abnormalFlag" "AbnormalFlag" NOT NULL DEFAULT 'NONE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL DEFAULT 'UNKNOWN',
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelationship" "ContactRelationship",
    "profilePhotoUrl" TEXT,
    "familyMedicalHistory" TEXT,
    "notes" TEXT,
    "insuranceProvider" TEXT,
    "insuranceNumber" TEXT,
    "insuranceGroup" TEXT,
    "insuranceValidUntil" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "category" TEXT,
    "reaction" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'MILD',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_conditions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icd10Code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "diagnosedOn" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_surgeries" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "performedOn" TIMESTAMP(3) NOT NULL,
    "hospital" TEXT,
    "surgeon" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "departmentId" TEXT,
    "designation" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "licenseNumber" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employmentType" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "healthcareCenterId" TEXT NOT NULL,
    "headDoctorId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location" TEXT,
    "defaultConsultationFee" DECIMAL(12,2),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "departmentId" TEXT,
    "specialization" TEXT,
    "qualification" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "consultationFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bio" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "bloodGroup" "BloodGroup",
    "profilePhotoUrl" TEXT,
    "defaultSlotDurationMinutes" INTEGER NOT NULL DEFAULT 20,
    "maxAppointmentsPerDay" INTEGER NOT NULL DEFAULT 24,
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 60,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "ratingAverage" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isSuperuser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_schedules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "slotDurationMinutes" INTEGER,
    "maxAppointmentsPerDay" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_leaves" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "LeaveType" NOT NULL DEFAULT 'ANNUAL',
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "healthcareCenterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "departmentId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "paymentStatus" "AppointmentPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "cancellationReason" "CancellationReason",
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "bookedByUserId" TEXT,
    "rescheduledFromId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthcare_centers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "logoUrl" TEXT,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subscriptionPlan" TEXT,
    "subscriptionEndsAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "healthcare_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_code_key" ON "users"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_center" ON "users"("healthcareCenterId");

-- CreateIndex
CREATE INDEX "idx_user_role" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "idx_user_status_deleted" ON "users"("status", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_tokenHash_key" ON "verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "idx_verification_token_email" ON "verification_tokens"("email", "purpose");

-- CreateIndex
CREATE INDEX "idx_verification_token_expires" ON "verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_password_history_user" ON "password_history"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "idx_service_center_status" ON "services"("healthcareCenterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "services_healthcareCenterId_name_key" ON "services"("healthcareCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "idx_invoice_center_status" ON "invoices"("healthcareCenterId", "status");

-- CreateIndex
CREATE INDEX "idx_invoice_patient" ON "invoices"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_invoice_due" ON "invoices"("dueAt", "status");

-- CreateIndex
CREATE INDEX "idx_invoice_doctor" ON "invoices"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_code_key" ON "invoice_items"("code");

-- CreateIndex
CREATE INDEX "idx_invoice_item_invoice" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "idx_payment_center_status" ON "payments"("healthcareCenterId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "idx_payment_invoice" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "idx_payment_patient" ON "payments"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_code_key" ON "medical_records"("code");

-- CreateIndex
CREATE INDEX "idx_record_patient_visit" ON "medical_records"("patientId", "visitDate");

-- CreateIndex
CREATE INDEX "idx_record_doctor_visit" ON "medical_records"("doctorId", "visitDate");

-- CreateIndex
CREATE INDEX "idx_record_center_visit" ON "medical_records"("healthcareCenterId", "visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "vital_signs_code_key" ON "vital_signs"("code");

-- CreateIndex
CREATE INDEX "idx_vital_record" ON "vital_signs"("medicalRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_code_key" ON "diagnoses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_supersededById_key" ON "diagnoses"("supersededById");

-- CreateIndex
CREATE INDEX "idx_diagnosis_patient" ON "diagnoses"("patientId", "diagnosedAt");

-- CreateIndex
CREATE INDEX "idx_diagnosis_record" ON "diagnoses"("medicalRecordId");

-- CreateIndex
CREATE INDEX "idx_diagnosis_center" ON "diagnoses"("healthcareCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_code_key" ON "medicines"("code");

-- CreateIndex
CREATE INDEX "idx_medicine_center_status" ON "medicines"("healthcareCenterId", "status");

-- CreateIndex
CREATE INDEX "idx_medicine_name" ON "medicines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_healthcareCenterId_name_strength_key" ON "medicines"("healthcareCenterId", "name", "strength");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_stock_code_key" ON "medicine_stock"("code");

-- CreateIndex
CREATE INDEX "idx_stock_medicine" ON "medicine_stock"("medicineId", "isActive");

-- CreateIndex
CREATE INDEX "idx_stock_center_expiry" ON "medicine_stock"("healthcareCenterId", "expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_code_key" ON "stock_movements"("code");

-- CreateIndex
CREATE INDEX "idx_stock_movement_batch" ON "stock_movements"("stockBatchId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_code_key" ON "prescriptions"("code");

-- CreateIndex
CREATE INDEX "idx_prescription_patient" ON "prescriptions"("patientId", "prescribedAt");

-- CreateIndex
CREATE INDEX "idx_prescription_doctor" ON "prescriptions"("doctorId", "prescribedAt");

-- CreateIndex
CREATE INDEX "idx_prescription_center_status" ON "prescriptions"("healthcareCenterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_items_code_key" ON "prescription_items"("code");

-- CreateIndex
CREATE INDEX "idx_prescription_item_prescription" ON "prescription_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "idx_prescription_item_medicine" ON "prescription_items"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_code_key" ON "notifications"("code");

-- CreateIndex
CREATE INDEX "idx_notification_user_unread" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_center" ON "notifications"("healthcareCenterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_dedupeKey_key" ON "notifications"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_code_key" ON "reviews"("code");

-- CreateIndex
CREATE INDEX "idx_review_doctor_status" ON "reviews"("doctorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_review_patient" ON "reviews"("patientId");

-- CreateIndex
CREATE INDEX "idx_review_center_status" ON "reviews"("healthcareCenterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointmentId_key" ON "reviews"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "medical_documents_code_key" ON "medical_documents"("code");

-- CreateIndex
CREATE UNIQUE INDEX "medical_documents_storageKey_key" ON "medical_documents"("storageKey");

-- CreateIndex
CREATE INDEX "idx_document_center_category" ON "medical_documents"("healthcareCenterId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "idx_document_patient" ON "medical_documents"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_document_scan" ON "medical_documents"("scanStatus");

-- CreateIndex
CREATE INDEX "idx_audit_user_time" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_center_time" ON "audit_logs"("healthcareCenterId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "idx_setting_center" ON "system_settings"("healthcareCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_healthcareCenterId_key_key" ON "system_settings"("healthcareCenterId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_categories_code_key" ON "laboratory_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_categories_healthcareCenterId_name_key" ON "laboratory_categories"("healthcareCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_tests_code_key" ON "laboratory_tests"("code");

-- CreateIndex
CREATE INDEX "idx_lab_test_center_status" ON "laboratory_tests"("healthcareCenterId", "status");

-- CreateIndex
CREATE INDEX "idx_lab_test_category" ON "laboratory_tests"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_tests_healthcareCenterId_name_key" ON "laboratory_tests"("healthcareCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_parameters_code_key" ON "lab_parameters"("code");

-- CreateIndex
CREATE INDEX "idx_lab_parameter_test" ON "lab_parameters"("testId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "lab_parameters_testId_name_key" ON "lab_parameters"("testId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lab_requests_code_key" ON "lab_requests"("code");

-- CreateIndex
CREATE INDEX "idx_lab_request_center_status" ON "lab_requests"("healthcareCenterId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "idx_lab_request_patient" ON "lab_requests"("patientId", "requestedAt");

-- CreateIndex
CREATE INDEX "idx_lab_request_doctor" ON "lab_requests"("doctorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "lab_request_items_code_key" ON "lab_request_items"("code");

-- CreateIndex
CREATE INDEX "idx_lab_request_item_test" ON "lab_request_items"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_request_items_labRequestId_testId_key" ON "lab_request_items"("labRequestId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_results_code_key" ON "lab_results"("code");

-- CreateIndex
CREATE INDEX "idx_lab_result_patient" ON "lab_results"("patientId", "reportedAt");

-- CreateIndex
CREATE INDEX "idx_lab_result_request" ON "lab_results"("labRequestId");

-- CreateIndex
CREATE INDEX "idx_lab_result_center" ON "lab_results"("healthcareCenterId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lab_result_values_code_key" ON "lab_result_values"("code");

-- CreateIndex
CREATE INDEX "idx_lab_result_value_parameter" ON "lab_result_values"("parameterId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_result_values_labResultId_parameterId_key" ON "lab_result_values"("labResultId", "parameterId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_code_key" ON "patients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "idx_patient_center_status" ON "patients"("healthcareCenterId", "status");

-- CreateIndex
CREATE INDEX "idx_patient_name" ON "patients"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "idx_patient_phone" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "idx_patient_email" ON "patients"("email");

-- CreateIndex
CREATE INDEX "idx_patient_registered" ON "patients"("registeredAt");

-- CreateIndex
CREATE INDEX "idx_patient_allergy_patient" ON "patient_allergies"("patientId", "isActive");

-- CreateIndex
CREATE INDEX "idx_patient_condition_patient" ON "patient_conditions"("patientId", "status");

-- CreateIndex
CREATE INDEX "idx_patient_surgery_patient" ON "patient_surgeries"("patientId", "performedOn");

-- CreateIndex
CREATE UNIQUE INDEX "staff_code_key" ON "staff"("code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "idx_staff_center" ON "staff"("healthcareCenterId");

-- CreateIndex
CREATE INDEX "idx_staff_department" ON "staff"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_headDoctorId_key" ON "departments"("headDoctorId");

-- CreateIndex
CREATE INDEX "idx_department_center_status" ON "departments"("healthcareCenterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "departments_healthcareCenterId_name_key" ON "departments"("healthcareCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_code_key" ON "doctors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_userId_key" ON "doctors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_licenseNumber_key" ON "doctors"("licenseNumber");

-- CreateIndex
CREATE INDEX "idx_doctor_center_status" ON "doctors"("healthcareCenterId", "status");

-- CreateIndex
CREATE INDEX "idx_doctor_department" ON "doctors"("departmentId");

-- CreateIndex
CREATE INDEX "idx_doctor_license" ON "doctors"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "idx_permission_resource" ON "permissions"("resource");

-- CreateIndex
CREATE INDEX "idx_role_permission_permission" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedules_code_key" ON "doctor_schedules"("code");

-- CreateIndex
CREATE INDEX "idx_schedule_doctor_day" ON "doctor_schedules"("doctorId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "idx_schedule_center" ON "doctor_schedules"("healthcareCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_leaves_code_key" ON "doctor_leaves"("code");

-- CreateIndex
CREATE INDEX "idx_leave_doctor_range" ON "doctor_leaves"("doctorId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "idx_leave_center_status" ON "doctor_leaves"("healthcareCenterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE INDEX "idx_appointment_center_start" ON "appointments"("healthcareCenterId", "startAt");

-- CreateIndex
CREATE INDEX "idx_appointment_doctor_start" ON "appointments"("doctorId", "startAt");

-- CreateIndex
CREATE INDEX "idx_appointment_patient_start" ON "appointments"("patientId", "startAt");

-- CreateIndex
CREATE INDEX "idx_appointment_status" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "idx_appointment_doctor_window" ON "appointments"("doctorId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_centers_code_key" ON "healthcare_centers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "healthcare_centers_slug_key" ON "healthcare_centers"("slug");

-- CreateIndex
CREATE INDEX "idx_center_status" ON "healthcare_centers"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "diagnoses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_stock" ADD CONSTRAINT "medicine_stock_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_stock" ADD CONSTRAINT "medicine_stock_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "medicine_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_categories" ADD CONSTRAINT "laboratory_categories_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_categories" ADD CONSTRAINT "laboratory_categories_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_tests" ADD CONSTRAINT "laboratory_tests_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_tests" ADD CONSTRAINT "laboratory_tests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "laboratory_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_parameters" ADD CONSTRAINT "lab_parameters_testId_fkey" FOREIGN KEY ("testId") REFERENCES "laboratory_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_requests" ADD CONSTRAINT "lab_requests_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_requests" ADD CONSTRAINT "lab_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_requests" ADD CONSTRAINT "lab_requests_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_requests" ADD CONSTRAINT "lab_requests_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_requests" ADD CONSTRAINT "lab_requests_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_request_items" ADD CONSTRAINT "lab_request_items_labRequestId_fkey" FOREIGN KEY ("labRequestId") REFERENCES "lab_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_request_items" ADD CONSTRAINT "lab_request_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "laboratory_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_labRequestId_fkey" FOREIGN KEY ("labRequestId") REFERENCES "lab_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_labRequestItemId_fkey" FOREIGN KEY ("labRequestItemId") REFERENCES "lab_request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_testId_fkey" FOREIGN KEY ("testId") REFERENCES "laboratory_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "lab_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "lab_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_conditions" ADD CONSTRAINT "patient_conditions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_surgeries" ADD CONSTRAINT "patient_surgeries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headDoctorId_fkey" FOREIGN KEY ("headDoctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leaves" ADD CONSTRAINT "doctor_leaves_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leaves" ADD CONSTRAINT "doctor_leaves_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_healthcareCenterId_fkey" FOREIGN KEY ("healthcareCenterId") REFERENCES "healthcare_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
