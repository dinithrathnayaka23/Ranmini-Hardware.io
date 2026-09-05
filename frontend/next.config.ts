import path from "node:path";

import type { NextConfig } from "next";

/**
 * Security response headers applied to every route.
 *
 * These are defence-in-depth: they limit the damage an injected script or a
 * malicious embedding page could do, on top of the httpOnly/SameSite cookies
 * used for the session itself.
 */
const securityHeaders = [
  // Block this app from being framed — the primary clickjacking defence for an
  // admin portal, where a hidden iframe could proxy privileged clicks.
  { key: "X-Frame-Options", value: "DENY" },

  // Stop browsers from MIME-sniffing a response into an executable type.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Never leak an admin URL (which can contain record ids) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // The portal needs none of these device capabilities.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // Force HTTPS for two years, including subdomains.
  // Only sent over HTTPS by browsers, so it is inert in local development.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` for styles is required by Next.js's injected style tags and
 * by Tailwind's runtime-injected rules. Scripts stay strict apart from the
 * `'unsafe-eval'` that the dev-mode React refresh runtime needs — production
 * builds do not get it.
 */
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  // The browser only ever talks to this origin; the Spring Boot API is reached
  // server-side by the Route Handlers, never directly from the page.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * How long the webpack development server keeps a compiled route in memory.
   *
   * Its defaults hold five routes for sixty seconds; this application has
   * fourteen screens under /admin alone, so ordinary use evicted a route within
   * a minute of leaving it and the next visit paid a full recompile. Holding
   * thirty routes for an hour means each screen compiles once per session.
   *
   * <p>Kept, but no longer the main answer: `npm run dev` passes `--turbopack`,
   * and this setting governs the webpack dev server it replaced. It still
   * applies to anyone who runs `next dev` without the flag. Measured on this
   * app, cold, on the same machine:
   *
   * <pre>
   *              startup   first page compile
   *   webpack     17.3s          24.7s
   *   turbopack    2.8s           8.0s
   * </pre>
   *
   * <p>Neither affects `next build` or `next start`, where every route is
   * compiled ahead of time — production serves these same pages in 40–80ms.
   */
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 30,
  },

  // Development-only overlay. Its default bottom-left position sits directly on
  // top of the portal sidebar's user profile, so move it out of the way.
  devIndicators: {
    position: "bottom-right",
  },

  // Pin the file-tracing root to this package so unrelated lockfiles elsewhere
  // on the machine cannot widen the production bundle's traced dependencies.
  outputFileTracingRoot: path.join(__dirname),

  // Do not advertise the framework version to attackers scanning for known CVEs.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
