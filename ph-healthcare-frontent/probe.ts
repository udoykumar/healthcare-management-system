import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

type Counter = { count: () => Promise<number> };

async function main() {
  const tables: [string, Counter][] = [
    ["users", prisma.user],
    ["doctors", prisma.doctor],
    ["patients", prisma.patient],
    ["departments", prisma.department],
    ["medicines", prisma.medicine],
    ["lab tests", prisma.laboratoryTest],
    ["services", prisma.service],
    ["doctor schedules", prisma.doctorSchedule],
    ["appointments", prisma.appointment],
    ["medical records", prisma.medicalRecord],
    ["prescriptions", prisma.prescription],
    ["lab requests", prisma.labRequest],
    ["lab results", prisma.labResult],
    ["invoices", prisma.invoice],
    ["payments", prisma.payment],
    ["reviews", prisma.review],
    ["notifications", prisma.notification],
    ["stock movements", prisma.stockMovement],
  ];

  for (const [label, model] of tables) {
    console.log(label.padEnd(20), await model.count());
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
