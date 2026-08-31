import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError } from "@/shared/lib/http-error";

import type { UserProfile } from "../types/auth.types";

/**
 * Who is signed in, according to the backend.
 *
 * <p>The session is resolved by asking the API rather than by decoding the
 * token here. That is deliberate: a token says what was true when it was
 * issued, and this app would happily render a portal for a cashier who was
 * deactivated ten minutes ago. Asking the service that owns the account means
 * a revoked user stops being signed in on their next page load.
 *
 * <p>Wrapped in React's `cache`, so a page whose layout, header and content all
 * need the user makes exactly one request per render rather than three.
 */
export const getSession = cache(async (): Promise<UserProfile | null> => {
  try {
    return await apiFetch<UserProfile>("/api/v1/auth/me");
  } catch (error) {
    // An expired or missing session is the ordinary case for a signed-out
    // visitor, not a fault: return null and let the caller redirect.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    // A backend that is down is a different problem, and pretending the user is
    // signed out would send them to a login page that also cannot work.
    throw error;
  }
});

/**
 * The signed-in user, or a redirect if there is none.
 *
 * Used by portal pages so each one does not repeat the null check — and so the
 * check cannot be forgotten on a page added later.
 */
export async function requireSession(): Promise<UserProfile> {
  const user = await getSession();
  // `redirect` throws, so nothing after it runs and the return type holds.
  if (!user) redirect(routes.adminLogin);
  return user;
}

/**
 * The signed-in user, required to be an administrator.
 *
 * A cashier who reaches a portal URL is sent to the till rather than to a
 * sign-in page: they are signed in perfectly well, just not to this. Bouncing
 * them to a login form they would pass and be rejected from again is a loop.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect(routes.cashierPos);
  return user;
}
