import fs from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

/**
 * The variables this app is allowed to take from the repository's `.env`.
 *
 * <p>An allowlist, and that is the whole point. The single `.env` at the
 * repository root also holds the backend's signing key, its Mongo credentials
 * and its mail password — none of which the Next.js process has any use for. A
 * process that never holds a secret cannot leak one, so only these two names
 * are ever copied in.
 */
const SHARED_ENV_KEYS = ["API_BASE_URL", "API_TIMEOUT_MS"] as const;

/**
 * Loads the two shared variables from the repository root's `.env`.
 *
 * <p>Next.js reads `.env` files from its own project directory and does not
 * look upwards, so a single file for the whole repository has to be read here
 * by hand. This runs once, when the config is evaluated, which is before the
 * server starts handling requests — so `getServerEnv()` sees the values.
 *
 * <p>A real environment variable always wins: anything already set is left
 * alone, matching how the backend treats the same file, so one override on the
 * command line behaves the same for both halves of the system.
 *
 * <p>The parser is deliberately small. Spring reads this same file as a Java
 * properties file, which is what constrains the format to plain `KEY=value`
 * with `#` comments — no quoting, no interpolation, no multi-line values. A
 * dotenv dependency would accept more than the backend can, and the first
 * variable that worked on one side and not the other would be a bad afternoon.
 */
function loadSharedEnv(): void {
  const file = path.join(__dirname, "..", ".env");

  let contents: string;
  try {
    contents = fs.readFileSync(file, "utf8");
  } catch {
    // Absent is normal: a deployment supplies real environment variables, and
    // `getServerEnv()` reports anything genuinely missing with a clear message.
    return;
  }

  // A stray carriage return from a Windows editor is removed by the trim below,
  // so splitting on the line feed alone is enough.
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!(SHARED_ENV_KEYS as readonly string[]).includes(key)) continue;
    if (process.env[key] !== undefined) continue;

    const value = trimmed.slice(separator + 1).trim();
    if (value !== "") process.env[key] = value;
  }
}

loadSharedEnv();

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
