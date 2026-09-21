import "server-only";

import { apiFetch } from "@/shared/lib/api.server";

import type { NotificationFeed } from "../types/notifications.types";

/**
 * The notification feed for the signed-in administrator.
 *
 * <p>Read on every portal page load, from the layout, so the badge is current
 * whenever somebody navigates. Never cached: an unread count that is thirty
 * seconds stale is a badge saying nothing happened when something did, and
 * being current is the only thing the bell is for.
 *
 * <p>Failures are swallowed into an empty feed rather than thrown. This is
 * chrome on every screen in the portal — a notifications outage must not be
 * able to take down the inventory table with it.
 *
 * <p><b>Deliberately the one administrator read that does not go through
 * `adminFetch`.</b> That wrapper refuses by redirecting, and a redirect in
 * Next.js is thrown — so the blanket `catch` below would swallow it and leave
 * the person on a page they are not allowed to see, which is the opposite of
 * what the guard is for. It needs no guard anyway: it is only ever called from
 * the portal layout, which runs `requireAdmin` itself, and a cashier whose
 * token reaches the backend is refused there and simply gets an empty bell.
 */
export async function fetchNotifications(): Promise<NotificationFeed> {
  try {
    return await apiFetch<NotificationFeed>("/api/v1/notifications", {
      session: "admin",
      cache: "no-store",
    });
  } catch {
    return { items: [], unreadCount: 0, generatedAt: new Date().toISOString() };
  }
}
