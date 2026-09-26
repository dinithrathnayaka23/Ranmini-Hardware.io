"use server";

import { cookies } from "next/headers";

import { baseAuthCookieOptions, sessionCookies } from "@/shared/config/cookies";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import { isPortalId, portals } from "./constants/portals";
import {
  choosePasswordSchema,
  forgotPasswordSchema,
  passwordHelpSchema,
  resetPasswordSchema,
  type ChoosePasswordValues,
  type ForgotPasswordValues,
  type PasswordHelpValues,
  type ResetPasswordValues,
} from "./schemas/password-reset.schema";
import { parseSessionResponse } from "./services/auth.server";

/**
 * Password recovery, run through the server rather than the browser.
 *
 * <p>These are the only auth calls that go through Server Actions instead of a
 * Route Handler. A Route Handler exists for sign-in because that response
 * carries tokens that have to be turned into httpOnly cookies. Only
 * {@link chooseNewPassword} receives tokens here, and it writes them straight
 * into those same cookies on the server, so none of these returns a credential
 * to the browser.
 *
 * <p>The recovery calls are explicitly unauthenticated. Someone recovering a
 * password has no session by definition, and sending a stale cookie along would
 * only risk the backend answering as whoever that cookie belongs to.
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

/**
 * Asks the shop owner to reset a password, for an account with no email.
 *
 * <p>Passes the backend's single, conditional answer straight through. It reads
 * the same whether or not the username exists, and nothing here may add to it.
 */
export async function requestPasswordHelp(
  values: PasswordHelpValues,
): Promise<RecoveryResult> {
  const parsed = passwordHelpSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    const response = await apiFetch<{ message: string }>(
      "/api/v1/auth/password-reset/help",
      { method: "POST", body: { username: parsed.data.username }, session: "public" },
    );

    return { success: true, message: response.message };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

export type ChoosePasswordResult =
  | { success: true; landingRoute: string }
  | { success: false; message: string };

/**
 * Replaces a temporary password, then swaps the session for an unrestricted one.
 *
 * <p>The backend answers with a fresh pair of tokens, and they are written into
 * the httpOnly cookies here, on the server, so they never pass through browser
 * JavaScript — the same rule the sign-in route follows.
 *
 * <p>The new cookies are session cookies, whatever "Remember me" said at sign-in.
 * That choice is not recorded anywhere this action can read, and when in doubt a
 * shared counter machine should forget the session when the browser closes.
 *
 * <p>The portal arrives from the browser, so it is narrowed before it may pick a
 * cookie. It only selects which session to act on; the backend decides whether
 * that session may do this at all.
 */
export async function chooseNewPassword(
  portalId: string,
  values: ChoosePasswordValues,
): Promise<ChoosePasswordResult> {
  if (!isPortalId(portalId)) {
    return { success: false, message: errorMessages.unexpected };
  }

  const parsed = choosePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  let payload: unknown;
  try {
    payload = await apiFetch<unknown>("/api/v1/auth/password/choose", {
      method: "POST",
      body: { password: parsed.data.password },
      session: portalId,
    });
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }

  const session = parseSessionResponse(payload);
  if (!session) {
    return { success: false, message: errorMessages.unexpected };
  }

  const jar = await cookies();
  const names = sessionCookies[portalId];

  jar.set(names.access, session.accessToken, baseAuthCookieOptions);
  if (session.refreshToken) {
    jar.set(names.refresh, session.refreshToken, baseAuthCookieOptions);
  }

  return { success: true, landingRoute: portals[portalId].landingRoute };
}
