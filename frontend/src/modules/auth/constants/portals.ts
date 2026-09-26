import { apiRoutes, routes } from "@/shared/config/app.config";

/**
 * The application has two sign-in surfaces — the management portal for
 * administrators and the till for cashiers — and they differ only in copy and
 * in where a successful sign-in lands.
 *
 * Describing that difference as data means both screens render from one form
 * component and post to one hardened endpoint. Adding a third portal later is
 * an entry here, not another copy of the login flow to keep in step.
 *
 * SECURITY NOTE: nothing in this file is a permission. The `id` selects which
 * BFF endpoint the form posts to, and that endpoint in turn selects a
 * *role-scoped* backend endpoint (see `services/auth.server.ts`); the backend
 * remains the only authority on which credentials may open which portal. A user
 * changing the portal in the browser changes which door they knock on, never
 * whether it opens.
 */
export const portalIds = ["admin", "cashier"] as const;

export type PortalId = (typeof portalIds)[number];

export interface PortalDefinition {
  id: PortalId;
  /** Page heading, e.g. "Cashier Sign In". */
  title: string;
  /** Supporting line beneath the heading. */
  subtitle: string;
  /** Sample username shown as the field's placeholder. */
  usernamePlaceholder: string;
  /** URL of this portal's own sign-in screen. */
  loginRoute: string;
  /** BFF endpoint the form posts credentials to. */
  apiEndpoint: string;
  /** Where the user is sent once the session cookie is set. */
  landingRoute: string;
  /**
   * The URL prefix this portal owns.
   *
   * <p>Used to check where a sign-in is allowed to return somebody. The two
   * portals are for different people now — an admin cannot use the till and a
   * cashier cannot use the portal — so a `?next=` pointing at the other side is
   * either a stale bookmark or somebody experimenting, and following it would
   * land the user on a screen that immediately bounces them somewhere else.
   */
  areaPrefix: string;
  /** This portal's "forgot password" page, linked from its sign-in form. */
  forgotPasswordRoute: string;
  /** Where this portal's emailed reset links land. */
  resetPasswordRoute: string;
  /**
   * Where a session holding a temporary password is sent to choose its own.
   * Per portal, so that the page — and the place it hands over to afterwards —
   * belongs to the side the person actually works on.
   */
  setPasswordRoute: string;
}

export const portals: Record<PortalId, PortalDefinition> = {
  admin: {
    id: "admin",
    title: "Admin Sign In",
    subtitle: "Enter your credentials to securely access the management portal.",
    usernamePlaceholder: "olitharanasinghe2003",
    loginRoute: routes.adminLogin,
    apiEndpoint: apiRoutes.loginFor("admin"),
    landingRoute: routes.adminDashboard,
    areaPrefix: "/admin",
    forgotPasswordRoute: routes.forgotPassword,
    resetPasswordRoute: routes.resetPassword,
    setPasswordRoute: routes.adminSetPassword,
  },
  cashier: {
    id: "cashier",
    title: "Cashier Sign In",
    // The supplied design carried the admin wording ("management portal") on
    // this screen too, and it was reproduced verbatim at the time rather than
    // silently reworded. Changed now because the question it was waiting on has
    // since been answered by the code: the portals reject each other's accounts,
    // so a cashier cannot reach the management portal at all. Telling them at
    // the door that this is the way into it is no longer a wording preference,
    // it is wrong. Revert if the client wants the original line back.
    subtitle: "Enter your credentials to securely access the point of sale.",
    usernamePlaceholder: "cashier123",
    loginRoute: routes.cashierLogin,
    apiEndpoint: apiRoutes.loginFor("cashier"),
    landingRoute: routes.cashierPos,
    areaPrefix: "/cashier",
    // Cashiers used to get no link at all, on the reasoning that an owner
    // resets their accounts in person. That left the one person locked out
    // with no way to even ask. The till's page offers an emailed link to those
    // with an address, and a request to the owner for everyone else.
    forgotPasswordRoute: routes.cashierForgotPassword,
    resetPasswordRoute: routes.cashierResetPassword,
    setPasswordRoute: routes.cashierSetPassword,
  },
};

/**
 * Narrows arbitrary text — a URL segment, a stored value — to a known portal.
 *
 * Used by the Route Handler before the portal is allowed to influence anything
 * else, so no attacker-supplied string can reach a throttle key or a backend
 * URL.
 */
export function isPortalId(value: string): value is PortalId {
  return (portalIds as readonly string[]).includes(value);
}

/**
 * Resolves the portal a given URL belongs to, defaulting to the admin portal.
 *
 * Used by chrome that is shared between both sign-in screens and therefore
 * cannot be told which one it is rendering inside.
 */
export function portalFromPathname(pathname: string): PortalDefinition {
  return pathname.startsWith("/cashier") ? portals.cashier : portals.admin;
}
