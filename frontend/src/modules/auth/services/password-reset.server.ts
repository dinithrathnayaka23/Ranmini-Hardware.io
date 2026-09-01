import "server-only";

import { apiFetch } from "@/shared/lib/api.server";

/**
 * Checks a reset link before the page renders a form for it.
 *
 * <p>Worth the round trip: without it, somebody following a link that expired
 * overnight types a new password twice, submits, and only then learns the link
 * was dead. Asking first lets the page say so straight away and offer a new one.
 *
 * <p>Treats any failure as "not valid". A backend that is unreachable cannot
 * confirm the link, and rendering the form on that basis would only move the
 * same failure to the submit button.
 */
export async function isResetTokenValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    const response = await apiFetch<{ valid: boolean }>(
      `/api/v1/auth/password-reset/validate?token=${encodeURIComponent(token)}`,
      { authenticated: false },
    );
    return response.valid;
  } catch {
    return false;
  }
}
