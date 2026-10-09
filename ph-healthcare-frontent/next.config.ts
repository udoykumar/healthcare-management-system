import type { NextConfig } from "next";

/**
 * Response headers applied to every route (§38).
 *
 * `src/proxy.ts` handles authentication redirects only — it does not set these.
 * Doing it here means the headers are attached in one place for every response,
 * including error pages and static assets, and cannot be forgotten by a route that
 * forgets to call a helper.
 *
 * `proxy.ts`'s header comment was previously claiming these lived there; they now
 * actually exist.
 */

/**
 * `frame-ancestors 'none'` rather than the older `X-Frame-Options: DENY`.
 *
 * `X-Frame-Options` is ignored by modern browsers when a `frame-ancestors`
 * directive is present, so it is included as well only as a fallback for very old
 * agents — it costs nothing and closes the hole for them.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; a nonce-based policy is the next step
  // and needs per-request header plumbing (see docs/authentication.md).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Recharts injects inline styles on SVG elements, and Tailwind utilities are fine,
  // but `style-src` still has to allow inline for dynamic chart geometry.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Prisma is server-side only; no connection is ever opened from the browser.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Camera and microphone are off: nothing in a records system needs them, and
    // denying by default means a future dependency cannot quietly turn them on.
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    // Only meaningful over HTTPS; harmless to send on localhost, which is why it is
    // unconditional rather than gated on NODE_ENV.
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Hides the server banner. Not a defence on its own, but it removes the version
  // string that makes CVE lookups trivial.
  { key: "X-Powered-By", value: "" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;