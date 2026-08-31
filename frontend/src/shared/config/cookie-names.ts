/**
 * Names of the session cookies.
 *
 * Split out from `cookies.ts` because that module is `server-only` and the
 * middleware — which needs to read the cookie to decide on a redirect — runs in
 * a different runtime. This file holds only names, no attributes and no logic,
 * so sharing it leaks nothing.
 *
 * The `__Host-` prefix is a guarantee the browser enforces: the cookie must be
 * Secure, path `/`, and carry no Domain attribute, which stops a compromised
 * sibling subdomain from overwriting our session. It requires HTTPS, so it is
 * applied only outside development.
 */
const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "";

export const cookieNames = {
  accessToken: `${prefix}rh_access_token`,
  refreshToken: `${prefix}rh_refresh_token`,
} as const;
