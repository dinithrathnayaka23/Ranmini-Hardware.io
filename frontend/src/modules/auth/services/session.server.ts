import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/shared/config/app.config";
import { sessionCookies } from "@/shared/config/cookies";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError } from "@/shared/lib/http-error";

import type { PortalId } from "../constants/portals";
import type { UserProfile } from "../types/auth.types";

/**
 * Who is signed in at a given portal, according to the backend.
 *
 * <p><b>Takes the portal, because there can be two.</b> The management portal
 * and the till hold separate cookies, so a browser may be signed in to one, the
 * other, both, or neither — the owner checking yesterday's takings on the
 * counter machine is all four cases in one afternoon. A function that answered
 * "who is signed in" without being asked which door would have to guess, and
 * guessing is what used to post a cashier's sale with the owner's token.
 *
 * <p>The session is resolved by asking the API rather than by decoding the
 * token here. That is deliberate: a token says what was true when it was
 * issued, and this app would happily render a portal for a cashier who was
 * deactivated ten minutes ago. Asking the service that owns the account means a
 * revoked user stops being signed in on their next page load.
 *
 * <p>Wrapped in React's `cache`, keyed on the portal, so a page whose layout,
 * header and content all need the user makes exactly one request per render
 * rather than three.
 */
export const getSession = cache(
  async (portal: PortalId): Promise<UserProfile | null> => {
    // No cookie, no session — and no round trip to be told so. This is the
    // ordinary case for the portal a visitor is not using, which is now half of
    // all the questions asked here.
    const token = (await cookies()).get(sessionCookies[portal].access)?.value;
    if (!token) return null;

    try {
      return await apiFetch<UserProfile>("/api/v1/auth/me", { session: portal });
    } catch (error) {
      // An expired or revoked session is the ordinary case for a stale cookie,
      // not a fault: return null and let the caller redirect.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return null;
      }
      // A backend that is down is a different problem, and pretending the user is
      // signed out would send them to a login page that also cannot work.
      throw error;
    }
  },
);

/**
 * Whichever portal this browser is signed in to, and which one it is.
 *
 * <p>For the handful of endpoints that serve both sides — a product photograph,
 * the shop's logo — where the caller needs to know who is asking but does not
 * care which door they came through. It hands back the portal as well as the
 * user so that the caller passes that same portal to {@link apiFetch}: taking
 * the identity from one session and the token from another would be a subtle
 * way to reintroduce the very mix-up the split cookies removed.
 *
 * <p>The portal is preferred over the till when both are signed in. It is an
 * arbitrary order and it does not matter: these endpoints accept either role,
 * and the answer is only ever used to fetch on behalf of the session it names.
 */
export async function getActiveSession(): Promise<
  { portal: PortalId; user: UserProfile } | null
> {
  const admin = await getSession("admin");
  if (admin) return { portal: "admin", user: admin };

  const cashier = await getSession("cashier");
  if (cashier) return { portal: "cashier", user: cashier };

  return null;
}

/**
 * The signed-in administrator, or a redirect.
 *
 * <p>Somebody signed in only at the till is sent to the till rather than to a
 * sign-in form they would pass and be turned away from — they are signed in
 * perfectly well, just not to this. Everyone else goes to the portal's own
 * sign-in page.
 *
 * <p>The role is checked as well as the session, although the sign-in route
 * refuses to put anything but an administrator's token in this cookie. It costs
 * nothing, and a guard that trusts a cookie to contain only what was meant to
 * be put there is a guard that stops being true the day something else writes
 * to it.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const user = await getSession("admin");

  if (!user) {
    // `redirect` throws, so nothing after it runs and the return type holds.
    if (await getSession("cashier")) redirect(routes.cashierPos);
    redirect(routes.adminLogin);
  }

  if (user.role !== "ADMIN") redirect(routes.cashierPos);
  return user;
}

/**
 * The signed-in cashier, or a redirect.
 *
 * <p>The mirror of {@link requireAdmin}: an owner who opens a till URL with no
 * till session goes back to their dashboard, because that is their screen, and
 * anybody else is sent to the till's own sign-in page rather than the portal's.
 *
 * <p>Like every guard here this is a redirect for the person, not the security
 * boundary. The backend refuses a token that is not a cashier's on every
 * `/api/v1/pos/` endpoint regardless of what the browser was allowed to render.
 */
export async function requireCashier(): Promise<UserProfile> {
  const user = await getSession("cashier");

  if (!user) {
    if (await getSession("admin")) redirect(routes.adminDashboard);
    redirect(routes.cashierLogin);
  }

  if (user.role !== "CASHIER") redirect(routes.adminDashboard);
  return user;
}
