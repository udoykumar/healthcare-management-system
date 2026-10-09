import { handlers } from "@/auth";

/**
 * Auth.js route handlers.
 *
 * Mounts sign-in, sign-out, session and callback endpoints under /api/auth.
 * Authorization for the rest of the API is handled by
 * `src/lib/authz/api.ts`, not here.
 */
export const { GET, POST } = handlers;