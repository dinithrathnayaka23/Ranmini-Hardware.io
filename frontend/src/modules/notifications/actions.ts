"use server";

import { apiFetch } from "@/shared/lib/api.server";

import type { NotificationFeed } from "./types/notifications.types";

/**
 * Marks everything currently in the feed as read.
 *
 * <p>Returns the feed it marked, which is what lets the panel open, clear its
 * badge and render its rows from a single round trip. The API is built for
 * exactly this: it stamps the moment the feed it hands back was generated, so
 * the marker can never run ahead of what was actually shown.
 *
 * <p>A read as well as a write, which is unusual for a Server Action — but the
 * alternative is a BFF route that exists only to attach the session token to a
 * request this action already has to make.
 */
export async function markNotificationsRead(): Promise<NotificationFeed | null> {
  try {
    return await apiFetch<NotificationFeed>("/api/v1/notifications/read", {
      method: "POST",
    });
  } catch {
    // The panel keeps showing what it already had. Failing to record that
    // somebody looked at their notifications is not worth an error message
    // over the top of the notifications they are reading.
    return null;
  }
}
