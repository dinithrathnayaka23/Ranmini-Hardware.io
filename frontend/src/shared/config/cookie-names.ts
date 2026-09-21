import type { PortalId } from "@/modules/auth/constants/portals";

/**
 * Names of the session cookies.
 *
 * Split out from `cookies.ts` because that module is `server-only` and the
 * middleware — which needs to read the cookie to decide on a redirect — runs in
 * a different runtime. This file holds only names, no attributes and no logic,
 * so sharing it leaks nothing. (`PortalId` above is a type, erased at compile
 * time, so it adds no runtime dependency either.)
 *
 * The `__Host-` prefix is a guarantee the browser enforces: the cookie must be
 * Secure, path `/`, and carry no Domain attribute, which stops a compromised
 * sibling subdomain from overwriting our session. It requires HTTPS, so it is
 * applied only outside development.
 */
const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "";

/**
 * <b>One session per portal, not one session per browser.</b>
 *
 * <p>Both portals used to share a single pair of cookies. Because they are one
 * origin, signing in at either door overwrote the other's session in place —
 * and silently, because the page that was already open went on rendering. The
 * shape of the failure was memorable: a cashier ringing up a customer, the
 * owner opening the management portal on the same machine, and the till then
 * refusing the payment with "Your account does not have access to that",
 * because the sale was being posted with the owner's token. Nothing appeared in
 * any log, since to the server it was a perfectly ordinary refusal.
 *
 * <p>Separate names mean the two sessions coexist. Signing in to the portal no
 * longer touches the till, signing out of one does not sign the other out, and
 * a token issued for one door can never be presented at the other, because
 * nothing ever reads it from there — every server-side call names the session
 * it is making, and gets a token or nothing.
 *
 * <p>The counter machine is the case that matters. The whole reason the two
 * portals were separated is that an owner leaving the portal signed in beside
 * the till should not put the business a click away; having their sign-in
 * quietly break the till as well was the same mistake wearing a different hat.
 */
export const sessionCookies = {
  admin: {
    access: `${prefix}rh_admin_token`,
    refresh: `${prefix}rh_admin_refresh`,
  },
  cashier: {
    access: `${prefix}rh_till_token`,
    refresh: `${prefix}rh_till_refresh`,
  },
} as const satisfies Record<PortalId, { access: string; refresh: string }>;

/** Every session cookie this application sets, for a wholesale clear-out. */
export const allSessionCookieNames: readonly string[] = Object.values(
  sessionCookies,
).flatMap((pair) => [pair.access, pair.refresh]);
