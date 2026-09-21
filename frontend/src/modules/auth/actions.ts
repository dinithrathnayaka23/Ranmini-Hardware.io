"use server";

import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "./schemas/password-reset.schema";

/**
 * Password recovery, run through the server rather than the browser.
 *
 * <p>These are the only auth calls that go through Server Actions instead of a
 * Route Handler. A Route Handler exists for sign-in because that response
 * carries tokens that have to be turned into httpOnly cookies; nothing here
 * returns a credential, so the simpler path is the right one.
 *
 * <p>Both calls are explicitly unauthenticated. Someone recovering a password
 * has no session by definition, and sending a stale cookie along would only
 * risk the backend answering as whoever that cookie belongs to.
 */

export type RecoveryResult =
  | { success: true; message: string }
  | { success: false; message: string };

/**
 * Asks the backend to email a reset link.
 *
 * <p>Note what this never reports: whether the address belongs to an account.
 * The backend answers identically either way, and this passes that answer
 * through unchanged. Anything else would turn the form into a way of testing
 * which addresses are staff addresses.
 */
export async function requestPasswordReset(
  values: ForgotPasswordValues,
): Promise<RecoveryResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    const response = await apiFetch<{ message: string }>(
      "/api/v1/auth/password-reset/request",
      // Nobody is signed in here by definition: this is the endpoint for
      // somebody who cannot get in.
      { method: "POST", body: { email: parsed.data.email }, session: "public" },
    );

    return { success: true, message: response.message };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

/** Spends the link and sets the new password. */
export async function confirmPasswordReset(
  values: ResetPasswordValues,
): Promise<RecoveryResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    const response = await apiFetch<{ message: string }>(
      "/api/v1/auth/password-reset/confirm",
      {
        method: "POST",
        body: { token: parsed.data.token, password: parsed.data.password },
        session: "public",
      },
    );

    return { success: true, message: response.message };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}
