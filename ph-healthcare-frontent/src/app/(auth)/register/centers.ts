import "server-only";

import { cache } from "react";

import { UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

/**
 * Healthcare centers a visitor may register with.
 *
 * Deliberately minimal: `id`, `name`, `city`. This is the one place the platform
 * exposes rows from more than one tenant, and it is a public, unauthenticated
 * page — so it must not surface a centre's revenue, staff count, address or
 * whether the centre exists at all beyond what a patient needs to pick it.
 *
 * Cached for the render: every visitor to /register in the same request burst
 * triggers one query rather than one each.
 */

export type RegisterableCenter = {
  id: string;
  name: string;
  city: string | null;
};

export const listRegisterableCenters = cache(
  async (): Promise<RegisterableCenter[]> => {
    try {
      return await prisma.healthcareCenter.findMany({
        where: { status: UserStatus.ACTIVE },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
        take: 100,
      });
    } catch (error) {
      // Registration must degrade to "contact your center" rather than a 500 when
      // the catalogue is briefly unreachable.
      console.error("[register] could not list healthcare centers:", error);
      return [];
    }
  },
);