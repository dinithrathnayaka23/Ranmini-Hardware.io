import { NextResponse, type NextRequest } from "next/server";

import { sessionCookies } from "@/shared/config/cookie-names";
import { routes } from "@/shared/config/app.config";

/**
 * Keeps signed-out visitors out of the portal and the till.
 *
 * <p><b>This is a redirect, not the security boundary.</b> It only checks that a
 * session cookie is present — it does not verify the token, and it cannot: the
 * middleware runs before the page and has no business making a network call on
 * every navigation. Someone with a forged or expired cookie gets past this and
 * is then stopped by `requireSession()` on the page, and by the backend, which
 * verifies the signature on every request.
 *
 * <p>What it buys is the thing a user notices: a signed-out visitor lands on the
 * right sign-in page immediately, instead of watching a portal shell render and
 * then vanish.
 *
 * <p>The two portals redirect to their own doors. Sending a cashier to the admin
 * login because they opened a bookmarked till URL would be a small mystery every
 * morning.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isTill = pathname.startsWith("/cashier");

  // Each portal looks only at its own cookie. They are separate sessions, so a
  // browser signed in to the management portal is not signed in at the till —
  // and sending somebody to the till because the owner happened to be signed in
  // on that machine is how a cashier ends up ringing up a sale as the owner.
  const portal = isTill ? "cashier" : "admin";
  const hasSession = Boolean(
    request.cookies.get(sessionCookies[portal].access)?.value,
  );

  if (hasSession) return NextResponse.next();

  const signInUrl = new URL(isTill ? routes.cashierLogin : routes.adminLogin, request.url);

  // Remember where they were headed so sign-in can return them there rather
  // than dumping everyone on the dashboard.
  signInUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(signInUrl);
}

/**
 * Which paths this runs on.
 *
 * Deliberately narrow: the sign-in pages themselves must stay reachable, and
 * running on `/api/auth/*` would lock a user out of the endpoint that gives
 * them a session in the first place.
 */
export const config = {
  matcher: ["/admin/dashboard/:path*", "/admin/inventory/:path*", "/admin/reports/:path*",
    "/admin/staff/:path*", "/admin/settings/:path*", "/admin/profile/:path*",
    "/cashier/pos/:path*",
    // Choosing a password needs the session a temporary password opened, so a
    // signed-out visitor goes to sign in first rather than to a dead form.
    "/admin/set-password", "/cashier/set-password"],
};
