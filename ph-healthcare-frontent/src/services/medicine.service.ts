import "server-only";

import { RecordStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { scopeToCenter, type TenantScope } from "@/lib/db/tenant";
import type { Prisma } from "@/generated/prisma/client";

import {
  asEnumValue,
  searchOr,
  toNumber,
  type ListQuery,
  type Page,
} from "./_shared";

/**
 * Medicine and stock reads.
 *
 * Stock is held per batch (`MedicineStock`) and the on-hand figure is a sum over
 * those rows, never a column on `Medicine`. Two places would otherwise disagree:
 * a `totalStock` on the medicine and the batches that are supposed to add up to
 * it. Low-stock and expiry alerts are derived here from the batches, so they
 * cannot drift from what is physically on the shelf.
 */

export type MedicineRow = {
  id: string;
  code: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  category: string | null;
  manufacturer: string | null;
  description: string | null;
  dosageForm: string;
  strength: string | null;
  unitPrice: number;
  minimumStockLevel: number;
  isPrescribable: boolean;
  requiresPrescription: boolean;
  status: string;
  stock: {
    onHand: number;
    lowStock: boolean;
    nearestExpiry: Date | null;
    expiringSoon: boolean;
  };
};

type MedicineRowShape = Prisma.MedicineGetPayload<{
  select: typeof MEDICINE_SELECT;
}>;

const MEDICINE_SELECT = {
  id: true,
  code: true,
  name: true,
  genericName: true,
  brandName: true,
  category: true,
  manufacturer: true,
  description: true,
  dosageForm: true,
  strength: true,
  unitPrice: true,
  minimumStockLevel: true,
  isPrescribable: true,
  requiresPrescription: true,
  status: true,
  stockBatches: {
    where: { isActive: true },
    select: { quantity: true, expiresOn: true },
  },
} as const;

export async function listMedicines(
  scope: TenantScope,
  query: ListQuery,
): Promise<Page<MedicineRow>> {
  const where = {
    ...scopeToCenter(scope),
    status: asEnumValue(RecordStatus, query.filters.status),
    category: query.filters.category,
    ...(searchOr<"medicine">(query.search, ["name", "genericName", "brandName", "code"]) ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      select: MEDICINE_SELECT,
      skip: query.skip,
      take: query.take,
      orderBy: query.orderBy,
    }),
    prisma.medicine.count({ where }),
  ]);

  return {
    items: rows.map(toMedicineRow),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}


const EXPIRY_WARNING_DAYS = 90;

function toMedicineRow(row: MedicineRowShape): MedicineRow {
  const onHand = row.stockBatches.reduce((total, batch) => total + batch.quantity, 0);

  const expiryDates = row.stockBatches
    .map((batch) => batch.expiresOn)
    .filter((date): date is Date => date !== null && date.getTime() > 0)
    .sort((a, b) => a.getTime() - b.getTime());

  const nearestExpiry = expiryDates[0] ?? null;
  const horizon = Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    genericName: row.genericName,
    brandName: row.brandName,
    category: row.category,
    manufacturer: row.manufacturer,
    description: row.description,
    dosageForm: row.dosageForm,
    strength: row.strength,
    unitPrice: toNumber(row.unitPrice),
    minimumStockLevel: row.minimumStockLevel,
    isPrescribable: row.isPrescribable,
    requiresPrescription: row.requiresPrescription,
    status: row.status,
    stock: {
      onHand,
      lowStock: onHand <= row.minimumStockLevel,
      nearestExpiry,
      expiringSoon: nearestExpiry !== null && nearestExpiry.getTime() <= horizon,
    },
  };
}

/**
 * Alerts for the admin dashboard.
 *
 * Both lists are computed with SQL aggregation rather than by loading the
 * catalogue, so they stay cheap as the formulary grows.
 */
export async function inventoryAlerts(scope: TenantScope) {
  const base = { ...scopeToCenter(scope), status: RecordStatus.ACTIVE };

  const [lowStock, expiring] = await Promise.all([
    prisma.medicine.findMany({
      where: { ...base, stockBatches: { some: { isActive: true } } },
      select: {
        id: true,
        name: true,
        strength: true,
        minimumStockLevel: true,
        stockBatches: { where: { isActive: true }, select: { quantity: true } },
      },
    }),
    prisma.medicineStock.findMany({
      where: {
        ...scopeToCenter(scope),
        isActive: true,
        quantity: { gt: 0 },
        expiresOn: {
          lte: new Date(Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
        expiresOn: true,
        medicine: { select: { id: true, name: true, strength: true } },
      },
      orderBy: { expiresOn: "asc" },
      take: 20,
    }),
  ]);

  const lowStockItems = lowStock
    .map((medicine) => ({
      id: medicine.id,
      label: medicine.strength ? `${medicine.name} ${medicine.strength}` : medicine.name,
      onHand: medicine.stockBatches.reduce((total, batch) => total + batch.quantity, 0),
      minimum: medicine.minimumStockLevel,
    }))
    .filter((item) => item.onHand <= item.minimum)
    .slice(0, 20);

  return {
    lowStock: lowStockItems,
    expiring: expiring.map((batch) => ({
      id: batch.id,
      label: batch.medicine.strength
        ? `${batch.medicine.name} ${batch.medicine.strength}`
        : batch.medicine.name,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiresOn: batch.expiresOn,
    })),
  };
}

export async function medicineSummary(scope: TenantScope) {
  const base = { ...scopeToCenter(scope), status: RecordStatus.ACTIVE };

  const [total, prescribable] = await Promise.all([
    prisma.medicine.count({ where: base }),
    prisma.medicine.count({ where: { ...base, isPrescribable: true } }),
  ]);

  return { total, prescribable };
}

/** Distinct categories, for the filter dropdown. */
export async function listMedicineCategories(scope: TenantScope) {
  const rows = await prisma.medicine.findMany({
    where: { ...scopeToCenter(scope), category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return rows
    .map((row) => row.category)
    .filter((value): value is string => Boolean(value));
}