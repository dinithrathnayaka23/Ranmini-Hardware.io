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
 */
export async function fetchNotifications(): Promise<NotificationFeed> {
  try {
    return await apiFetch<NotificationFeed>("/api/v1/notifications", {
      cache: "no-store",
    });
  } catch {
    return { items: [], unreadCount: 0, generatedAt: new Date().toISOString() };
  }
}
