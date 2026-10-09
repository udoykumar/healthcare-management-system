import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Package,
  Pill,
  Receipt,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

import { RoleKey } from "@/generated/prisma/enums";
import type { Permission } from "@/lib/authz/permissions";
import { PERMISSIONS } from "@/lib/authz/permissions";

/**
 * The application's navigation model.
 *
 * One table drives the sidebar, the command palette and the breadcrumb lookup.
 * Defining routes in a component instead would mean the sidebar, the search and
 * the breadcrumbs each keep their own list, and they drift.
 *
 * Each entry carries the permission required to see it. That decides whether the
 * link is *rendered* — and it is only that. Every page and route handler the link
 * points at enforces the same permission server-side via `requirePermission`.
 * Hiding a menu item is a courtesy to the user, never the boundary itself.
 */

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rendered only when the user holds this permission. */
  permission?: Permission;
  /** Rendered only for these roles. */
  roles?: RoleKey[];
  /** Optional count badge, e.g. unread notifications. */
  badge?: "notifications";
  children?: NavItem[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV: Record<RoleKey, NavGroup[]> = {
  SUPERADMIN: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/dashboard/superadmin", icon: LayoutDashboard },
      ],
    },
    {
      label: "Platform",
      items: [
        {
          label: "Healthcare centers",
          href: "/dashboard/superadmin/centers",
          icon: Building2,
          permission: PERMISSIONS.CENTER_READ,
        },
        {
          label: "Administrators",
          href: "/dashboard/superadmin/admins",
          icon: UserCog,
          permission: PERMISSIONS.USER_READ,
        },
        {
          label: "All users",
          href: "/dashboard/superadmin/users",
          icon: Users,
          permission: PERMISSIONS.USER_READ,
        },
      ],
    },
    {
      label: "Activity",
      items: [
        {
          label: "Audit logs",
          href: "/dashboard/superadmin/audit-logs",
          icon: ShieldCheck,
          permission: PERMISSIONS.AUDIT_LOG_READ,
        },
      ],
    },
    {
      label: "Configuration",
      items: [
        {
          label: "Permissions",
          href: "/dashboard/superadmin/permissions",
          icon: ShieldCheck,
          permission: PERMISSIONS.PERMISSION_MANAGE,
        },
        {
          label: "System settings",
          href: "/dashboard/superadmin/settings",
          icon: Settings,
          permission: PERMISSIONS.SETTINGS_READ,
        },
      ],
    },
  ],

  ADMIN: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
        {
          label: "Appointments",
          href: "/dashboard/admin/appointments",
          icon: CalendarDays,
          permission: PERMISSIONS.APPOINTMENT_READ,
        },
      ],
    },
    {
      label: "People",
      items: [
        {
          label: "Patients",
          href: "/dashboard/admin/patients",
          icon: Users,
          permission: PERMISSIONS.PATIENT_READ,
        },
        {
          label: "Doctors",
          href: "/dashboard/admin/doctors",
          icon: Stethoscope,
          permission: PERMISSIONS.DOCTOR_READ,
        },
        {
          label: "Staff",
          href: "/dashboard/admin/staff",
          icon: UserCog,
          permission: PERMISSIONS.STAFF_READ,
        },
        {
          label: "Departments",
          href: "/dashboard/admin/departments",
          icon: Building2,
          permission: PERMISSIONS.DEPARTMENT_READ,
        },
      ],
    },
    {
      label: "Clinical",
      items: [
        {
          label: "Medicines",
          href: "/dashboard/admin/medicines",
          icon: Pill,
          permission: PERMISSIONS.MEDICINE_READ,
        },
        {
          label: "Laboratory",
          href: "/dashboard/admin/laboratory",
          icon: FlaskConical,
          permission: PERMISSIONS.LAB_REQUEST_READ,
        },
        {
          label: "Services",
          href: "/dashboard/admin/services",
          icon: Activity,
          permission: PERMISSIONS.SERVICE_READ,
        },
      ],
    },
    {
      label: "Finance",
      items: [
        {
          label: "Invoices",
          href: "/dashboard/admin/invoices",
          icon: Receipt,
          permission: PERMISSIONS.INVOICE_READ,
        },
        {
          label: "Payments",
          href: "/dashboard/admin/payments",
          icon: CreditCard,
          permission: PERMISSIONS.PAYMENT_READ,
        },
        {
          label: "Reports",
          href: "/dashboard/admin/reports",
          icon: FileText,
          permission: PERMISSIONS.REPORT_READ,
        },
      ],
    },
    {
      label: "Configuration",
      items: [
        {
          label: "Schedules",
          href: "/dashboard/admin/schedules",
          icon: CalendarDays,
          permission: PERMISSIONS.SCHEDULE_MANAGE,
        },
        {
          label: "Documents",
          href: "/dashboard/admin/documents",
          icon: ClipboardList,
          permission: PERMISSIONS.DOCUMENT_READ,
        },
        {
          label: "Reviews",
          href: "/dashboard/admin/reviews",
          icon: ClipboardList,
          permission: PERMISSIONS.REVIEW_MODERATE,
        },
        {
          label: "Settings",
          href: "/dashboard/admin/settings",
          icon: Settings,
          permission: PERMISSIONS.SETTINGS_READ,
        },
      ],
    },
  ],

  DOCTOR: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/dashboard/doctor", icon: LayoutDashboard },
        {
          label: "My appointments",
          href: "/dashboard/doctor/appointments",
          icon: CalendarDays,
          permission: PERMISSIONS.APPOINTMENT_READ,
        },
      ],
    },
    {
      label: "Clinical",
      items: [
        {
          label: "My patients",
          href: "/dashboard/doctor/patients",
          icon: Users,
          permission: PERMISSIONS.PATIENT_READ_OWN,
        },
        {
          label: "Medical records",
          href: "/dashboard/doctor/medical-records",
          icon: ClipboardList,
          permission: PERMISSIONS.RECORD_READ,
        },
        {
          label: "Prescriptions",
          href: "/dashboard/doctor/prescriptions",
          icon: FileText,
          permission: PERMISSIONS.PRESCRIPTION_READ,
        },
        {
          label: "Laboratory",
          href: "/dashboard/doctor/laboratory",
          icon: FlaskConical,
          permission: PERMISSIONS.LAB_REQUEST_READ,
        },
      ],
    },
    {
      label: "Practice",
      items: [
        {
          label: "My schedule",
          href: "/dashboard/doctor/schedule",
          icon: CalendarDays,
          permission: PERMISSIONS.SCHEDULE_READ_OWN,
        },
        {
          label: "My patients' reviews",
          href: "/dashboard/doctor/reviews",
          icon: ClipboardList,
          permission: PERMISSIONS.REVIEW_READ,
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          label: "My profile",
          href: "/dashboard/doctor/profile",
          icon: UserRound,
          permission: PERMISSIONS.DOCTOR_READ_OWN,
        },
      ],
    },
  ],

  PATIENT: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/dashboard/patient", icon: LayoutDashboard },
      ],
    },
    {
      label: "My care",
      items: [
        {
          label: "Appointments",
          href: "/dashboard/patient/appointments",
          icon: CalendarDays,
          permission: PERMISSIONS.APPOINTMENT_READ_OWN,
        },
        {
          label: "Medical history",
          href: "/dashboard/patient/medical-history",
          icon: ClipboardList,
          permission: PERMISSIONS.RECORD_READ_OWN,
        },
        {
          label: "Prescriptions",
          href: "/dashboard/patient/prescriptions",
          icon: Pill,
          permission: PERMISSIONS.PRESCRIPTION_READ_OWN,
        },
        {
          label: "Lab reports",
          href: "/dashboard/patient/laboratory",
          icon: FlaskConical,
          permission: PERMISSIONS.LAB_RESULT_READ_OWN,
        },
        {
          label: "Documents",
          href: "/dashboard/patient/documents",
          icon: FileText,
          permission: PERMISSIONS.DOCUMENT_READ_OWN,
        },
      ],
    },
    {
      label: "Payments",
      items: [
        {
          label: "Invoices",
          href: "/dashboard/patient/invoices",
          icon: Receipt,
          permission: PERMISSIONS.INVOICE_READ_OWN,
        },
        {
          label: "Payment history",
          href: "/dashboard/patient/payments",
          icon: Banknote,
          permission: PERMISSIONS.PAYMENT_READ_OWN,
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          label: "Find a doctor",
          href: "/dashboard/patient/doctors",
          icon: Stethoscope,
          permission: PERMISSIONS.DOCTOR_READ,
        },
        {
          label: "Notifications",
          href: "/dashboard/patient/notifications",
          icon: Bell,
          permission: PERMISSIONS.NOTIFICATION_READ_OWN,
          badge: "notifications",
        },
        {
          label: "My profile",
          href: "/dashboard/patient/profile",
          icon: UserRound,
          permission: PERMISSIONS.PATIENT_READ_OWN,
        },
      ],
    },
  ],
};

/** The home route for a role. `/dashboard` redirects here. */
export const ROLE_HOME: Record<RoleKey, string> = {
  SUPERADMIN: "/dashboard/superadmin",
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  PATIENT: "/dashboard/patient",
};

export const ROLE_LABEL: Record<RoleKey, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  PATIENT: "Patient",
};

/**
 * Resolves the breadcrumb trail for a pathname.
 *
 * Matches the longest href in the navigation table so a detail page such as
 * `/dashboard/admin/patients/pt_123` reports "Patients / PT-123" rather than
 * falling back to the bare section name.
 */
export function breadcrumbsFor(
  role: RoleKey,
  pathname: string,
  dynamicLabel?: string,
): { label: string; href?: string }[] {
  const groups = NAV[role] ?? [];
  const all = groups.flatMap((group) => group.items);

  // Exclude a parent link that is an ancestor of the longest match.
  const match = [...all]
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const rootHref = ROLE_HOME[role];
  const crumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: rootHref },
  ];

  if (!match) {
    if (dynamicLabel) crumbs.push({ label: dynamicLabel });
    return crumbs;
  }

  if (match.href !== rootHref) crumbs.push({ label: match.label, href: match.href });

  const remainder = pathname.slice(match.href.length).replace(/^\//, "");
  if (remainder) {
    crumbs.push({ label: dynamicLabel ?? titleFromSlug(remainder) });
  }

  return crumbs;
}

function titleFromSlug(slug: string): string {
  const last = slug.split("/").pop() ?? slug;
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .slice(0, 60);
}

export { Package };