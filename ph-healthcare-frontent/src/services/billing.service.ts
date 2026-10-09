import "server-only";

import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import { AppError } from "@/lib/api/errors";

import {
  asEnumValue,
  endOfMonth,
  monthWindow,
  searchOr,
  startOfMonth,
  toMonthlySeries,
  toNumber,
  type ListQuery,
  type Page,
  type Series,
} from "./_shared";

/**
 * Billing reads.
 *
 * Money rule (§58): nothing here ever recomputes a total from client input.
 * `Invoice.subtotalAmount`, `discountAmount`, `taxAmount`, `totalAmount` and
 * `dueAmount` are written by the billing write-path inside a transaction; these
 * functions only read and sum what is already stored. Prisma's `aggregate` runs
 * the summation in the database, so a dashboard figure is the sum of real rows
 * rather than a JS re-addition of a truncated page.
 */

const INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  status: true,
  issuedAt: true,
  dueAt: true,
  subtotalAmount: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  paidAmount: true,
  refundedAmount: true,
  dueAmount: true,
  currency: true,
  notes: true,
  createdAt: true,
  patient: {
    select: { id: true, code: true, firstName: true, lastName: true, phone: true },
  },
  doctor: { select: { id: true, code: true, user: { select: { name: true } } } },
  appointment: { select: { id: true, appointmentNumber: true, startAt: true } },
  _count: { select: { items: true, payments: true } },
} as const;

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  subtotalAmount: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  totalAmount: unknown;
  paidAmount: unknown;
  refundedAmount: unknown;
  dueAmount: unknown;
  currency: string;
  notes: string | null;
  createdAt: Date;
  patient: { id: string; code: string; firstName: string; lastName: string; phone: string | null };
  doctor: { id: string; code: string; user: { name: string } } | null;
  appointment: { id: string; appointmentNumber: string; startAt: Date } | null;
  _count: { items: number; payments: number };
};

export type InvoiceRowShape = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  createdAt: Date;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  dueAmount: number;
  currency: string;
  notes: string | null;
  patient: { id: string; code: string; name: string; phone: string | null };
  doctor: { id: string; code: string; name: string } | null;
  appointment: { id: string; appointmentNumber: string; startAt: Date } | null;
  itemCount: number;
  paymentCount: number;
};

function toInvoice(row: InvoiceRow): InvoiceRowShape {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    issuedAt: row.issuedAt,
    dueAt: row.dueAt,
    createdAt: row.createdAt,
    subtotalAmount: toNumber(row.subtotalAmount),
    discountAmount: toNumber(row.discountAmount),
    taxAmount: toNumber(row.taxAmount),
    totalAmount: toNumber(row.totalAmount),
    paidAmount: toNumber(row.paidAmount),
    refundedAmount: toNumber(row.refundedAmount),
    dueAmount: toNumber(row.dueAmount),
    currency: row.currency,
    notes: row.notes,
    patient: {
      id: row.patient.id,
      code: row.patient.code,
      name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      phone: row.patient.phone,
    },
    doctor: row.doctor
      ? { id: row.doctor.id, code: row.doctor.code, name: row.doctor.user.name }
      : null,
    appointment: row.appointment,
    itemCount: row._count.items,
    paymentCount: row._count.payments,
  };
}

function scopeInvoiceFilter(scope: TenantScope): Record<string, unknown> {
  if (scope.role === "PATIENT") return { patientId: scope.patientId ?? "__none__" };
  if (scope.role === "DOCTOR") return { doctorId: scope.doctorId ?? "__none__" };
  return {};
}

export async function listInvoices(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<InvoiceRowShape>> {
  const where = {
    ...scopeToCenter(scope),
    ...scopeInvoiceFilter(scope),
    status: asEnumValue(InvoiceStatus, query.filters.status),
    doctorId: query.filters.doctorId,
    patientId: query.filters.patientId,
    createdAt: dateFilter(query.filters.from, query.filters.to),
    ...(searchOr<"invoice">(query.search, ["invoiceNumber", "notes", "patient.code"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: INVOICE_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: rows.map((row) => toInvoice(row as InvoiceRow)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getInvoice(scope: TenantScope, invoiceId: string) {
  const row = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...scopeToCenter(scope), ...scopeInvoiceFilter(scope) },
    select: {
      ...INVOICE_SELECT,
      items: {
        select: {
          id: true,
          description: true,
          detail: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          taxAmount: true,
          lineTotal: true,
          sortOrder: true,
          service: { select: { id: true, name: true } },
          medicine: { select: { id: true, name: true, strength: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      payments: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          refundedAmount: true,
          method: true,
          status: true,
          transactionId: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!row) throw AppError.notFound("That invoice was not found.");

  return {
    ...toInvoice(row as InvoiceRow),
    items: row.items.map((item) => ({
      id: item.id,
      description: item.description,
      detail: item.detail,
      quantity: Number(item.quantity.toString()),
      unitPrice: toNumber(item.unitPrice),
      discountAmount: toNumber(item.discountAmount),
      taxAmount: toNumber(item.taxAmount),
      lineTotal: toNumber(item.lineTotal),
      service: item.service,
      medicine: item.medicine,
    })),
    payments: row.payments.map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      amount: toNumber(payment.amount),
      refundedAmount: toNumber(payment.refundedAmount),
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
  };
}

export type PaymentRowShape = {
  id: string;
  paymentNumber: string;
  amount: number;
  refundedAmount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string | null;
  cardLast4: string | null;
  bankName: string | null;
  notes: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  patient: { id: string; code: string; name: string };
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    dueAmount: number;
  };
};

export async function listPayments(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<PaymentRowShape>> {
  const where = {
    ...scopeToCenter(scope),
    ...(scope.role === "PATIENT" ? { patientId: scope.patientId ?? "__none__" } : {}),
    status: asEnumValue(PaymentStatus, query.filters.status),
    method: asEnumValue(PaymentMethod, query.filters.method),
    paidAt: dateFilter(query.filters.from, query.filters.to),
    ...(searchOr<"payment">(query.search, ["paymentNumber", "transactionId"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        refundedAmount: true,
        currency: true,
        method: true,
        status: true,
        transactionId: true,
        cardLast4: true,
        bankName: true,
        notes: true,
        paidAt: true,
        refundedAt: true,
        createdAt: true,
        patient: { select: { id: true, code: true, firstName: true, lastName: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true, dueAmount: true } },
      },
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      paymentNumber: row.paymentNumber,
      amount: toNumber(row.amount),
      refundedAmount: toNumber(row.refundedAmount),
      currency: row.currency,
      method: row.method,
      status: row.status,
      transactionId: row.transactionId,
      cardLast4: row.cardLast4,
      bankName: row.bankName,
      notes: row.notes,
      paidAt: row.paidAt,
      refundedAt: row.refundedAt,
      createdAt: row.createdAt,
      patient: {
        ...row.patient,
        name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      },
      invoice: {
        ...row.invoice,
        dueAmount: toNumber(row.invoice.dueAmount),
      },
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Money headline for the admin dashboard.
 *
 * `collected` counts only COMPLETED payments; `outstanding` sums `dueAmount` on
 * invoices that are issued or partly paid and not cancelled or refunded. Both are
 * database aggregates.
 */
export async function billingSummary(scope: TenantScope, currency = "USD") {
  const base = { ...scopeToCenter(scope), ...scopeInvoiceFilter(scope) };
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [monthRevenue, outstanding, overdue, invoiceCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        ...base,
        status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED] },
        issuedAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        ...base,
        status: {
          in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
        },
      },
      _sum: { dueAmount: true },
      _count: { _all: true },
    }),
    prisma.invoice.count({
      where: {
        ...base,
        status: InvoiceStatus.OVERDUE,
      },
    }),
    prisma.invoice.count({ where: base }),
  ]);

  return {
    currency,
    monthRevenue: toNumber(monthRevenue._sum.totalAmount),
    monthInvoiceCount: monthRevenue._count._all,
    outstandingAmount: toNumber(outstanding._sum.dueAmount),
    outstandingCount: outstanding._count._all,
    overdueCount: overdue,
    invoiceCount,
  };
}

/** Monthly collected revenue, for the admin revenue chart. */
export async function revenueSeries(scope: TenantScope, months = 6): Promise<Series> {
  const { start, end } = monthWindow(months);

  const invoices = await prisma.invoice.findMany({
    where: {
      ...scopeToCenter(scope),
      ...scopeInvoiceFilter(scope),
      status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED] },
      issuedAt: { gte: start, lte: end },
    },
    select: { issuedAt: true, totalAmount: true },
  });

  return toMonthlySeries(
    invoices,
    months,
    (row) => row.issuedAt,
    (row) => toNumber(row.totalAmount),
    "Revenue",
  );
}

/**
 * A patient's outstanding balance.
 *
 * Used by the patient dashboard tile. Scoped to the caller's own patient id, so a
 * patient cannot pass another id and read their balance.
 */
export async function patientOutstanding(
  scope: TenantScope,
  patientId?: string,
) {
  const target =
    scope.role === "PATIENT" ? (scope.patientId ?? null) : (patientId ?? null);

  if (!target) {
    throw AppError.forbidden("No patient record is linked to this account.", "NO_PATIENT_PROFILE");
  }

  const totals = await prisma.invoice.aggregate({
    where: {
      ...scopeToCenter(scope),
      patientId: target,
      status: {
        in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
      },
    },
    _sum: { dueAmount: true },
    _count: { _all: true },
  });

  return {
    dueAmount: toNumber(totals._sum.dueAmount),
    invoiceCount: totals._count._all,
  };
}

function dateFilter(
  from: string | undefined,
  to: string | undefined,
): { gte?: Date; lte?: Date } | undefined {
  const gte = parseDay(from);
  const lte = parseDay(to);
  if (!gte && !lte) return undefined;
  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte: new Date(lte.getTime() + 86_399_999) } : {}),
  };
}

function parseDay(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}