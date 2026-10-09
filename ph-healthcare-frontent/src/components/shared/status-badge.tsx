import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils/format";

/**
 * `StatusBadge` — one consistent colour language for every status in the system.
 *
 * The mapping is data, not ad-hoc classes at call sites. That is what stops the
 * app from ending up with four different greens for "COMPLETED" and two different
 * reds for "CANCELLED" on different screens, which is exactly what happens when
 * each feature picks its own badge colours.
 */

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "purple";

const TONE_CLASSES: Record<Tone, string> = {
  neutral:
    "bg-muted text-muted-foreground border-transparent dark:bg-muted/60",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  success:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  warning:
    "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  danger:
    "bg-destructive/10 text-destructive border-destructive/20 dark:text-destructive",
  purple: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300",
};

/**
 * Every status the application renders, mapped to a tone.
 *
 * One flat table rather than a lookup per feature, so a given status always gets
 * the same colour on every screen. Grouped by which enum it belongs to, with a
 * comment where the same word means something different in two enums — notably
 * COMPLETED (appointment: success) versus COMPLETED (lab request: success) versus
 * PAID (invoice: success, payment: success), and PENDING which is a warning
 * everywhere because it always means "waiting on someone".
 */
const STATUS_TONES: Record<string, Tone> = {
  // UserStatus
  PENDING_VERIFICATION: "warning",
  INACTIVE: "neutral",
  BLOCKED: "danger",
  DELETED: "neutral",

  // AppointmentStatus
  CHECKED_IN: "info",
  IN_PROGRESS: "purple",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  RESCHEDULED: "neutral",

  // AppointmentPaymentStatus
  NOT_REQUIRED: "neutral",
  UNPAID: "warning",
  PARTIAL: "info",
  PAID: "success",
  REFUNDED: "purple",

  // PrescriptionStatus
  DRAFT: "neutral",
  ISSUED: "success",

  // LabRequestStatus — shares PENDING/COMPLETED/CANCELLED with appointments
  SAMPLE_COLLECTED: "info",
  PROCESSING: "purple",

  // LabPriority
  ROUTINE: "neutral",
  URGENT: "warning",
  STAT: "danger",

  // AbnormalFlag
  NONE: "success",
  LOW: "warning",
  HIGH: "warning",
  CRITICAL_LOW: "danger",
  CRITICAL_HIGH: "danger",

  // InvoiceStatus shares PAID; PARTIALLY_PAID and OVERDUE are its own
  PARTIALLY_PAID: "warning",
  OVERDUE: "danger",

  // PaymentStatus
  FAILED: "danger",

  // LeaveStatus
  APPROVED: "success",
  REJECTED: "danger",

  // ReviewStatus
  PUBLISHED: "success",
  HIDDEN: "neutral",

  // Document scanStatus
  CLEAN: "success",
  INFECTED: "danger",

  // PaymentMethod
  CASH: "neutral",
  CARD: "info",
  BANK_TRANSFER: "info",
  MOBILE_PAYMENT: "purple",
  ONLINE_PAYMENT: "success",
  INSURANCE: "info",

  // RecordStatus
  ACTIVE: "success",

  // PENDING is shared by appointment, prescription, invoice, review, leave and
  // document scan — always "waiting on someone", so always a warning.
  PENDING: "warning",
};

export function StatusBadge({
  status,
  label,
  tone,
  className,
  dot = false,
}: {
  status: string;
  /** Overrides the auto-derived text. */
  label?: string;
  /** Overrides the auto-derived colour. */
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  const resolvedTone = tone ?? STATUS_TONES[status] ?? "neutral";
  const text = label ?? humanize(status);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", TONE_CLASSES[resolvedTone], className)}
    >
      {dot ? (
        <span
          className="size-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {text}
    </Badge>
  );
}

/** Severity maps onto the same colour language. */
export function SeverityBadge({
  severity,
  className,
}: {
  severity: string;
  className?: string;
}) {
  const tone: Tone =
    severity === "CRITICAL"
      ? "danger"
      : severity === "SEVERE"
        ? "warning"
        : severity === "MODERATE"
          ? "info"
          : "neutral";

  return (
    <StatusBadge status={severity} tone={tone} className={className} />
  );
}

/**
 * An abnormal laboratory value.
 *
 * Critical values get a bold red badge with an icon rather than colour alone —
 * a clinician scanning a report should not have to distinguish two shades of red
 * to spot a critical potassium.
 */
export function AbnormalFlagBadge({
  flag,
  className,
}: {
  flag: string;
  className?: string;
}) {
  if (flag === "NONE") {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>Normal</span>
    );
  }

  const critical = flag.startsWith("CRITICAL");

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-semibold",
        critical
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {critical ? (
        <svg
          viewBox="0 0 16 16"
          className="size-3"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1.5 15 14H1L8 1.5Zm0 4.2a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 8 5.7Zm0 6.1a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
        </svg>
      ) : null}
      {humanize(flag)}
    </Badge>
  );
}

export type { Tone as StatusTone };