import "server-only";

import { AppError } from "@/lib/api/errors";
import { isProduction } from "@/lib/env";

/**
 * In-process fixed-window rate limiter (§38).
 *
 * Scope: this protects a single Node process. Behind more than one instance it
 * under-counts, because each process keeps its own buckets. It is the right tool
 * for the endpoints it is actually applied to — login, password reset, and upload
 * — where the abuse being stopped is a human hammering one origin, not a
 * distributed attack. A multi-instance deployment should swap the store in
 * `BUCKETS` for Redis, which is the only change required; the interface is
 * deliberately two methods.
 *
 * Note the deliberate asymmetry: a limiter that is too eager locks out real
 * patients during a clinic rush, so the windows here are generous compared to a
 * security-only system.
 */

type Bucket = { count: number; resetAt: number };

const BUCKETS = new Map<string, Bucket>();

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now: number): void {
  if (BUCKETS.size < 5_000) return;
  for (const [key, bucket] of BUCKETS) {
    if (bucket.resetAt <= now) BUCKETS.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSeconds: number;
};

/**
 * Records an attempt against `key` and reports whether it is allowed.
 *
 * @param key   Identifier, e.g. `login:203.0.113.9` or `reset:user@example.com`.
 * @param limit Attempts allowed within the window.
 * @param windowMs Window length.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = BUCKETS.get(key);

  if (!existing || existing.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds,
  };
}

/** Throws a 429 when the limit is exceeded. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw AppError.tooManyRequests(
      `Too many attempts. Please try again in ${result.retryAfterSeconds} second(s).`,
      result.retryAfterSeconds,
    );
  }
}

/**
 * Identifies the caller for rate-limiting purposes.
 *
 * Prefers the proxy-supplied client IP. `x-forwarded-for` is a client-controlled
 * header, so the *first* entry is only trustworthy behind a proxy that overwrites
 * it; in production set the platform's real client IP into
 * `x-vercel-forwarded-for` or equivalent rather than trusting this blindly.
 */
export function clientIp(request: Request): string {
  const trusted = request.headers.get("x-vercel-forwarded-for");
  if (trusted) return trusted.split(",")[0]?.trim() ?? "unknown";

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";

  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Named limits, so call sites read as intent rather than magic numbers. */
export const LIMITS = {
  /** Sign-in: 10 per 15 minutes per IP. */
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Password reset request: 3 per hour per email. */
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Registration: 5 per hour per IP. */
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Document upload: 30 per hour per user. */
  upload: { limit: 30, windowMs: 60 * 60 * 1000 },
  /** General API ceiling: 600 per minute per IP. */
  api: { limit: 600, windowMs: 60 * 1000 },
} as const;

/** Clears all buckets. Test-only; never called from application code. */
export function resetRateLimits(): void {
  BUCKETS.clear();
}

export const rateLimitDebugInfo = isProduction ? null : { size: () => BUCKETS.size };