import { NextResponse } from "next/server";

import { loginSchema } from "@/modules/auth/schemas/login.schema";
import { authenticateAdmin } from "@/modules/auth/services/auth.server";
import type { LoginOutcome } from "@/modules/auth/types/auth.types";
import {
  REMEMBERED_SESSION_SECONDS,
  authCookieMaxAge,
  baseAuthCookieOptions,
  cookieNames,
} from "@/shared/config/cookies";
import { ApiError, errorMessages } from "@/shared/lib/http-error";
import {
  checkRateLimit,
  clientKeyFromHeaders,
  resetRateLimit,
} from "@/shared/lib/rate-limit";

/**
 * POST /api/auth/login — the browser's only entry point for signing in.
 *
 * Responsibilities, in order:
 *   1. Throttle repeated attempts from the same client.
 *   2. Re-validate the request body server-side (the client schema is a UX aid,
 *      not a control — this endpoint is publicly reachable).
 *   3. Delegate the actual credential check to the Spring Boot API.
 *   4. Store the returned tokens in httpOnly cookies, so no token is ever
 *      readable by JavaScript in the browser.
 *
 * The response body carries the admin profile only — never a token.
 */

// Session cookies must never be cached, and this route has no static output.
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const clientKey = clientKeyFromHeaders(request.headers);
  const limit = checkRateLimit(`login:${clientKey}`);

  if (!limit.allowed) {
    return jsonError(errorMessages.rateLimited, 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  // A malformed body is a client error, not something worth logging loudly.
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    // Field-level reasons are withheld here on purpose: the form already
    // explains them locally, and a public endpoint should stay terse.
    return jsonError(errorMessages.invalidCredentials, 400);
  }

  const { rememberMe } = parsed.data;

  try {
    // The service decides what actually reaches the backend; `rememberMe` is
    // dropped there because cookie lifetime is a browser-side concern.
    const session = await authenticateAdmin(parsed.data);

    // A genuine sign-in clears the throttle so one user's typo streak does not
    // lock them out after they succeed.
    resetRateLimit(`login:${clientKey}`);

    const outcome: LoginOutcome = { success: true, user: session.user };
    const response = NextResponse.json(outcome, { status: 200 });

    // The access cookie tracks the backend-issued lifetime; "Remember Me" only
    // decides whether the cookie survives the browser being closed.
    response.cookies.set(cookieNames.accessToken, session.accessToken, {
      ...baseAuthCookieOptions,
      maxAge: rememberMe ? session.expiresIn : undefined,
    });

    if (session.refreshToken) {
      response.cookies.set(cookieNames.refreshToken, session.refreshToken, {
        ...baseAuthCookieOptions,
        maxAge: authCookieMaxAge(rememberMe, REMEMBERED_SESSION_SECONDS),
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status === 503 ? 503 : 401);
    }

    console.error("[auth] Unhandled error during admin login:", error);
    return jsonError(errorMessages.unexpected, 500);
  }
}

/** Uniform error envelope: `{ success: false, message }`, never a stack trace. */
function jsonError(
  message: string,
  status: number,
  headers?: Record<string, string>,
): NextResponse {
  const outcome: LoginOutcome = { success: false, message };
  return NextResponse.json(outcome, { status, headers });
}
