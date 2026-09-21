import "server-only";

// Names live in their own module so the middleware, which runs in a different
// runtime, can read them without pulling in this server-only file.
export { sessionCookies, allSessionCookieNames } from "./cookie-names";

/**
 * Baseline attributes for every auth cookie.
 *
 * - `httpOnly` keeps the token out of `document.cookie`, so an XSS payload
 *   cannot read or exfiltrate the session.
 * - `sameSite: "strict"` blocks the cookie on cross-site requests, which is
 *   our primary CSRF defence for the admin portal.
 * - `secure` is always on in production; in local development over plain HTTP
 *   the browser would otherwise drop the cookie entirely.
 */
export const baseAuthCookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/**
 * "Remember me" controls cookie lifetime only, never token lifetime — the
 * backend remains the single authority on how long a token is actually valid.
 *
 * Without it the cookie is a session cookie (cleared when the browser closes).
 */
export function authCookieMaxAge(
  rememberMe: boolean,
  fallbackSeconds: number,
): number | undefined {
  return rememberMe ? fallbackSeconds : undefined;
}

/** Cookie lifetime used when "Remember Me" is ticked: 7 days. */
export const REMEMBERED_SESSION_SECONDS = 60 * 60 * 24 * 7;
