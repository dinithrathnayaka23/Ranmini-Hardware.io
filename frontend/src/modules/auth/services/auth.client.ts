import { apiRoutes } from "@/shared/config/app.config";
import { errorMessages } from "@/shared/lib/http-error";

import type { PortalDefinition } from "../constants/portals";
import type { LoginFormValues } from "../schemas/login.schema";
import type { LoginOutcome } from "../types/auth.types";

/**
 * Browser-side auth calls.
 *
 * Every request goes to this app's own origin (`/api/auth/*`), which keeps the
 * Spring Boot API off the public network and lets the Route Handler set
 * httpOnly session cookies the browser can never read.
 */

/**
 * Submits credentials to the sign-in endpoint belonging to `portal`.
 *
 * The portal is part of the URL rather than the payload so the server can
 * identify and throttle the attempt before reading the body.
 *
 * Never throws — a login form should render a message, not a crashed boundary.
 */
export async function login(
  portal: PortalDefinition,
  values: LoginFormValues,
): Promise<LoginOutcome> {
  try {
    const response = await fetch(portal.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      // Required so the Set-Cookie coming back is stored by the browser.
      credentials: "same-origin",
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        message: readMessage(payload) ?? errorMessages.unexpected,
      };
    }

    return payload as LoginOutcome;
  } catch {
    // fetch itself rejected: the user is offline or the app server is down.
    return { success: false, message: errorMessages.network };
  }
}

/**
 * Ends the session by asking the BFF to expire the auth cookies.
 *
 * The cookies are httpOnly, so the browser cannot clear them itself — only the
 * server that set them can. Returns whether the clearing actually succeeded,
 * because navigating away from a session that is still live would look like a
 * sign-out without being one.
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(apiRoutes.logout, {
      method: "POST",
      credentials: "same-origin",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Safely pulls a `message` string out of an unknown JSON error body. */
function readMessage(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as { message: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }
  return null;
}
