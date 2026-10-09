import type { DefaultSession } from "next-auth";

import type { RoleKey } from "@/generated/prisma/enums";

/**
 * Auth.js module augmentation.
 *
 * Auth.js types `session.user` with no `id` by default, which is the usual
 * friction point when a JWT session is the only session. Declaring `id` here
 * means every `useSession()` consumer gets it without a cast.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleKey;
    } & DefaultSession["user"];
  }

  interface User {
    role?: RoleKey;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: RoleKey;
  }
}

export {};