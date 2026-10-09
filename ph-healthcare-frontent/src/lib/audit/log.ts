import "server-only";

import { AuditAction } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Audit logging (§39).
 *
 * Two rules govern what goes in here:
 *
 *   1. `audit()` must never throw. An audit write that fails must not roll back or
 *      fail the user's actual request — losing the log line is bad, but refusing a
 *      completed clinical action because logging broke is worse. Failures are
 *      logged to the console instead.
 *
 *   2. `metadata` holds identifiers and counts, never clinical content. Audit rows
 *      are read by administrators and exported for compliance; a patient's
 *      symptoms or a prescription's medicines have no business being duplicated
 *      into them. Pass `{ patientId, count: 3 }`, never `{ symptoms: "..." }`.
 */

export type AuditInput = {
  action: AuditAction;

  /** Who acted. Null for failed logins and other anonymous attempts. */
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;

  healthcareCenterId?: string | null;

  /** Table name, e.g. "Appointment". */
  entity?: string;
  entityId?: string;

  ipAddress?: string | null;
  userAgent?: string | null;

  /** Set false for denied or failed actions. */
  succeeded?: boolean;
  /** Short machine-readable reason, e.g. "role_denied". */
  reason?: string;

  /** Identifiers and counts only. See rule 2. */
  metadata?: Record<string, unknown>;
};

/**
 * Writes one audit row. Never throws.
 *
 * Deliberately not awaited by most call sites in the same expression — most use
 * `void audit(...)` or await it where ordering matters (e.g. login success).
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const userAgent = input.userAgent ?? null;

    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        healthcareCenterId: input.healthcareCenterId ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: userAgent ? truncate(userAgent, 512) : null,
        succeeded: input.succeeded ?? true,
        reason: input.reason ?? null,
        metadata:
          input.metadata === undefined
            ? undefined
            : (sanitizeMetadata(input.metadata, input.userEmail, input.userRole) as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log:", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Strips anything that looks like a secret or bulk content before persisting.
 *
 * A second line of defence behind rule 2: the key list is a denylist, so a caller
 * that forgets the rule still cannot write a password or a clinical narrative.
 */
const FORBIDDEN_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "passwordhash",
  "token",
  "refreshtoken",
  "accesstoken",
  "secret",
  "authorization",
  "cookie",
  "symptoms",
  "clinicalnotes",
  "diagnosis",
  "medicines",
  "prescription",
]);

function sanitizeMetadata(
  metadata: Record<string, unknown>,
  email?: string | null,
  role?: string | null,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    clean[key] = typeof value === "string" ? truncate(value, 256) : value;
  }

  // For an anonymous action there is no userId to join on, so the attempted
  // identity is recorded explicitly rather than being lost.
  if (!clean.email && email) clean.email = email;
  if (!clean.role && role) clean.role = role;

  return clean;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

/**
 * Builds a uniform metadata object for a "something happened to this entity"
 * event, so the shape stays consistent across the codebase.
 */
export function entityMeta(
  entity: string,
  id: string,
  extra?: Record<string, unknown>,
): { entity: string; entityId: string; metadata: Record<string, unknown> } {
  return {
    entity,
    entityId: id,
    metadata: extra ?? {},
  };
}