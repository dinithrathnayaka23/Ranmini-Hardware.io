import "server-only";

import {
  apiFetch,
  apiFetchOrNull,
  type RequestOptions,
} from "@/shared/lib/api.server";
import { guardedLoad } from "@/shared/lib/guarded-load";

import { requireAdmin, requireCashier } from "./session.server";

/**
 * Reads that state which side of the shop they belong to.
 *
 * <p><b>Why these exist rather than a guard in the layout.</b> A Next.js layout
 * does not block the page inside it — the two render <em>in parallel</em>. So
 * `PortalLayout` calling `requireAdmin()` does nothing whatsoever to stop the
 * page beneath it from fetching administrator-only data at the same instant.
 * When a cashier opened `/admin/inventory`, the layout began redirecting them to
 * the till while the page went ahead and asked for the inventory, got the
 * backend's 403, and rendered an error page — the guard and the fetch racing
 * each other exactly as they did on the till before.
 *
 * <p>Guarding each page instead would work, right up until somebody adds the
 * thirteenth page and does not remember to. So the check belongs here, on the
 * read itself: every screen gets its data from one of these module services, so
 * a read that is only for administrators cannot be performed for anyone else,
 * whatever the page above it did or forgot to do. A new screen is protected
 * because it asks for protected data, not because its author remembered.
 *
 * <p><b>The ordering, not the timing, is what was wrong.</b> These still issue
 * the request immediately, in parallel with the session check, so a legitimate
 * administrator waits no longer than before — the session round trip is shared
 * across the whole render by React's `cache`, and overlapping it with the data
 * is the reason portal pages feel instant. What {@link guardedLoad} adds is that
 * only the guard can decide the outcome: somebody on the wrong side of the shop
 * is redirected to their own screen, deterministically, and the refused response
 * that arrives a moment later is discarded rather than raced against.
 *
 * <p><b>Each also picks the session it belongs to.</b> The two portals hold
 * separate cookies, so "the signed-in user" is ambiguous on a machine where the
 * owner has the portal open beside the till. These wrappers resolve that by
 * construction: an administrator read is made with the administrator's token
 * and a till read with the cashier's, and neither can borrow the other's.
 *
 * <p><b>These are for reads that render a page, not for Server Actions.</b> An
 * action catches `ApiError` and returns a message for the form to show,
 * which is the right behaviour for a submitted form — and a `catch` around a
 * redirect would swallow it, which Next.js rightly treats as a bug. Actions
 * keep calling `apiFetch` directly and stay protected by the backend, which
 * refuses them regardless of what the browser believes.
 */

/** A read from the management portal: the admin session, and an administrator. */
export async function adminFetch<T>(
  path: string,
  options?: Omit<RequestOptions, "session">,
): Promise<T> {
  const [, data] = await guardedLoad(
    requireAdmin(),
    apiFetch<T>(path, { ...options, session: "admin" }),
  );
  return data;
}

/**
 * An administrator read where a missing record is an ordinary answer.
 *
 * <p>The invoice lookup on the daily report uses this: typing a receipt number
 * that does not exist is a normal thing for a shopkeeper to do, not a failure
 * worth interrupting the page for.
 */
export async function adminFetchOrNull<T>(
  path: string,
  options?: Omit<RequestOptions, "session">,
): Promise<T | null> {
  const [, data] = await guardedLoad(
    requireAdmin(),
    apiFetchOrNull<T>(path, { ...options, session: "admin" }),
  );
  return data;
}

/** A read from the till: the till session, and a cashier. */
export async function cashierFetch<T>(
  path: string,
  options?: Omit<RequestOptions, "session">,
): Promise<T> {
  const [, data] = await guardedLoad(
    requireCashier(),
    apiFetch<T>(path, { ...options, session: "cashier" }),
  );
  return data;
}
