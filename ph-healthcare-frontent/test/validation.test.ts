import { describe, expect, it } from "vitest";

import {
  bookAppointmentSchema,
  createInvoiceSchema,
  recordPaymentSchema,
  registerSchema,
  updateAppointmentStatusSchema,
  vitalSignsSchema,
} from "@/lib/validations/shared";
import { idSchema, paginationSchema, timeSchema } from "@/lib/api/validate";
import { buildListArgs } from "@/lib/api/validate";
import {
  hhmmFromMinutes,
  isoDayToKey,
  keyToIsoDay,
  minutesFromHHmm,
  rangesOverlap,
} from "@/lib/utils/datetime";

/**
 * Business rules that must hold (§58).
 *
 * The theme: these tests exist for the rules where a regression is a real-world
 * problem rather than a visual one — a booking that double-books a doctor, an
 * invoice that trusts a client-supplied total, a payment larger than the balance,
 * an unbounded page size.
 */
describe("appointment double-booking support", () => {
  it("detects overlapping half-open ranges", () => {
    // [09:00, 10:00) vs [09:30, 10:30) overlap.
    expect(rangesOverlap(540, 600, 570, 630)).toBe(true);
  });

  it("treats an abutting booking as no overlap", () => {
    // Half-open ranges: a 10:00 booking may follow a 09:00–10:00 one exactly.
    expect(rangesOverlap(540, 600, 600, 660)).toBe(false);
    expect(rangesOverlap(600, 660, 540, 600)).toBe(false);
  });

  it("detects containment in both directions", () => {
    expect(rangesOverlap(540, 720, 600, 660)).toBe(true);
    expect(rangesOverlap(600, 660, 540, 720)).toBe(true);
  });
});

describe("rota time strings", () => {
  it("round-trips HH:mm through minutes", () => {
    for (const value of ["00:00", "09:30", "13:05", "23:59"]) {
      const minutes = minutesFromHHmm(value);
      expect(minutes).not.toBeNull();
      expect(hhmmFromMinutes(minutes as number)).toBe(value);
    }
  });

  it("rejects malformed wall-clock values", () => {
    for (const bad of ["24:00", "9:00", "09:60", "", "nine", "09:00:00"]) {
      expect(minutesFromHHmm(bad)).toBeNull();
    }
  });

  it("clamps out-of-range minutes instead of rolling into another day", () => {
    expect(hhmmFromMinutes(-60)).toBe("00:00");
    expect(hhmmFromMinutes(24 * 60 + 600)).toBe("23:59");
  });

  it("validates HH:mm in the schema layer too", () => {
    expect(timeSchema.safeParse("09:30").success).toBe(true);
    expect(timeSchema.safeParse("25:00").success).toBe(false);
  });

  it("maps ISO weekday numbers to rota keys and back", () => {
    // ISO-8601: 0 = Sunday. A rota stored against the wrong number silently moves
    // a doctor's clinic to the wrong day, so the round trip is worth asserting.
    for (const isoDay of [0, 1, 2, 3, 4, 5, 6]) {
      expect(keyToIsoDay(isoDayToKey(isoDay))).toBe(isoDay);
    }
  });
});

describe("appointment booking input", () => {
  const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const valid = () => ({
    doctorId: "doc_1",
    // patientId is optional: an admin can book on a patient's behalf without
    // passing their id, which is exactly the walk-in flow.
    startAt: future(),
    type: "IN_PERSON",
    departmentId: "dep_1",
    reason: "Follow-up on blood pressure",
  });

  it("accepts a well-formed booking", () => {
    expect(bookAppointmentSchema.safeParse(valid()).success).toBe(true);
  });

  it("requires a real doctor", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid(), doctorId: "" }).success).toBe(false);
  });

  it("refuses an appointment in the past", () => {
    // Booking into the past is how a double-booked slot gets created retroactively.
    expect(
      bookAppointmentSchema.safeParse({
        ...valid(),
        startAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }).success,
    ).toBe(false);
  });

  it("rejects a start time the database could not store", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid(), startAt: "" }).success).toBe(false);
    expect(
      bookAppointmentSchema.safeParse({ ...valid(), startAt: "not-a-date" }).success,
    ).toBe(false);
  });

  it("rejects an appointment type outside the enum", () => {
    expect(bookAppointmentSchema.safeParse({ ...valid(), type: "WALK_IN" }).success).toBe(false);
  });

  it("defaults the type rather than requiring it", () => {
    const parsed = bookAppointmentSchema.safeParse({
      doctorId: "doc_1",
      startAt: future(),
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.type).toBe("IN_PERSON");
  });
});

describe("appointment status transitions", () => {
  it("accepts the statuses a transition may target", () => {
    // RESCHEDULED is set by the reschedule flow, not by a manual status change, so
    // it is deliberately absent here.
    for (const status of [
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]) {
      expect(
        updateAppointmentStatusSchema.safeParse({ status }).success,
      ).toBe(true);
    }
  });

  it("rejects a status that does not exist", () => {
    expect(updateAppointmentStatusSchema.safeParse({ status: "ALMOST_DONE" }).success).toBe(false);
  });
});

describe("vital signs", () => {
  it("accepts a normal reading", () => {
    const result = vitalSignsSchema.safeParse({
      bloodPressureSystolic: "120",
      bloodPressureDiastolic: "80",
      heartRate: "72",
      temperature: "36.8",
      weight: "68.5",
      height: "170",
    });

    expect(result.success).toBe(true);
  });

  it("refuses physiologically impossible values", () => {
    // A heart rate of 900 is a typo, not a patient. Storing it would put nonsense
    // into the chart where a clinician would later read it.
    expect(vitalSignsSchema.safeParse({ heartRate: "900" }).success).toBe(false);
    expect(vitalSignsSchema.safeParse({ temperature: "300" }).success).toBe(false);
    expect(
      vitalSignsSchema.safeParse({ bloodPressureSystolic: "5000" }).success,
    ).toBe(false);
    // Oxygen saturation below 50% is not survivable; a value that low is a typo.
    expect(
      vitalSignsSchema.safeParse({ oxygenSaturation: "20" }).success,
    ).toBe(false);
  });

  it("treats an untouched field as absent rather than as zero", () => {
    // An HTML form submits "" for every blank input. Storing 0 for a blank
    // temperature would be worse than storing nothing.
    const parsed = vitalSignsSchema.safeParse({ heartRate: "", weight: "" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.heartRate).toBeUndefined();
      expect(parsed.data.weight).toBeUndefined();
    }
  });
});

describe("money is never taken from the client", () => {
  it("refuses a client-supplied invoice total", () => {
    // The schema has no `total`/`totalAmount` field at all: totals are computed
    // server-side from line items. Zod strips unknown keys, so a caller-supplied
    // total simply has nowhere to land.
    const parsed = createInvoiceSchema.safeParse({
      patientId: "pt_1",
      items: [{ description: "Consultation", quantity: 1, unitPrice: 60 }],
      totalAmount: 1,
      dueAmount: 0,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("totalAmount" in parsed.data).toBe(false);
      expect("dueAmount" in parsed.data).toBe(false);
    }
  });

  it("requires at least one line item", () => {
    expect(
      createInvoiceSchema.safeParse({ patientId: "pt_1", items: [] }).success,
    ).toBe(false);
  });

  it("refuses a non-positive payment amount", () => {
    // A zero or negative payment would credit an invoice without taking money.
    expect(
      recordPaymentSchema.safeParse({
        invoiceId: "inv_1",
        amount: 0,
        method: "CASH",
      }).success,
    ).toBe(false);

    expect(
      recordPaymentSchema.safeParse({
        invoiceId: "inv_1",
        amount: -50,
        method: "CASH",
      }).success,
    ).toBe(false);
  });

  it("accepts a payment method from the documented set only", () => {
    expect(
      recordPaymentSchema.safeParse({
        invoiceId: "inv_1",
        amount: 50,
        method: "CASH",
      }).success,
    ).toBe(true);

    expect(
      recordPaymentSchema.safeParse({
        invoiceId: "inv_1",
        amount: 50,
        method: "CRYPTO",
      }).success,
    ).toBe(false);
  });
});

describe("registration is patient-only", () => {
  const base = {
    firstName: "Demo",
    lastName: "Patient",
    email: "demo@example.com",
    phone: "+8801700000000",
    password: "correct horse battery",
    confirmPassword: "correct horse battery",
    dateOfBirth: "1990-05-21",
    gender: "FEMALE",
    healthcareCenterId: "hc_1",
    acceptTerms: true,
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("requires the terms to be accepted", () => {
    expect(
      registerSchema.safeParse({ ...base, acceptTerms: false }).success,
    ).toBe(false);
  });

  it("requires the two passwords to match", () => {
    expect(
      registerSchema.safeParse({ ...base, confirmPassword: "something else" }).success,
    ).toBe(false);
  });

  it("has no role field, so a signup cannot choose one", () => {
    // This is the privilege-escalation guard: the role is written server-side from
    // a constant, and there is nowhere in the schema for a caller to put one.
    const parsed = registerSchema.safeParse({ ...base, role: "SUPERADMIN" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("role" in parsed.data).toBe(false);
    }
  });
});

describe("pagination is bounded", () => {
  it("rejects an oversized page size rather than clamping it", () => {
    // Without a bound, ?pageSize=100000 turns a clinic's whole patient table into
    // one response. Rejecting is better than silently clamping: a caller asking for
    // 100000 rows has a bug, and returning 200 rows without saying so hides it.
    expect(paginationSchema.safeParse({ pageSize: "100000" }).success).toBe(false);
    expect(paginationSchema.parse({ pageSize: "200" }).pageSize).toBe(200);
  });

  it("refuses a zero or negative page", () => {
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("turns an empty search into no search", () => {
    expect(paginationSchema.parse({ search: "   " }).search).toBeUndefined();
  });

  it("falls back to a default sort for an unknown column", () => {
    // `sort` reaches Prisma's orderBy, so an unchecked string is both an injection
    // surface and a source of runtime errors.
    const args = buildListArgs(
      {
        page: 2,
        pageSize: 25,
        search: undefined,
        sort: "password_hash",
        order: "desc",
      },
      ["createdAt", "startAt"],
      "createdAt",
    );

    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.skip).toBe(25);
    expect(args.take).toBe(25);
  });
});

describe("id validation", () => {
  it("rejects an empty id", () => {
    expect(idSchema.safeParse("").success).toBe(false);
  });

  it("rejects an id with a path separator", () => {
    // Route params reach the database; a `../` here would be a path traversal if the
    // value were ever used to build a file path.
    expect(idSchema.safeParse("../../etc/passwd").success).toBe(false);
  });

  it("accepts an ordinary identifier", () => {
    expect(idSchema.safeParse("pt_123abc").success).toBe(true);
  });
});