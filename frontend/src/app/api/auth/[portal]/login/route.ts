import { NextResponse } from "next/server";

import { isPortalId, type PortalId } from "@/modules/auth/constants/portals";
import { loginSchema } from "@/modules/auth/schemas/login.schema";
import { authenticateUser } from "@/modules/auth/services/auth.server";
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
 * POST /api/auth/{portal}/login — the browser's only entry point for signing
 * in, serving both the admin portal and the cashier till.
 *
 * Responsibilities, in order:
 *   1. Resolve the portal from the URL against a closed set.
 *   2. Throttle repeated attempts from the same client on that portal.
 *   3. Re-validate the request body server-side (the client schema is a UX aid,
 *      not a control — this endpoint is publicly reachable).
 *   4. Delegate the actual credential check to the Spring Boot API, against the
 *      endpoint scoped to that portal.
 *   5. Store the returned tokens in httpOnly cookies, so no token is ever
 *      readable by JavaScript in the browser.
 *
 * The response body carries the user profile only — never a token.
 *
 * One handler serves both portals on purpose: throttling, cookie attributes and
 * error shaping are security-relevant and must not drift between two
 * near-identical copies of this file.
 *
 * The portal travels in the URL rather than in the body specifically so that
 * steps 1 and 2 both happen *before* the body is read — an unthrottled client
 * should never be able to make this route buffer a request payload.
 */

// Session cookies must never be cached, and this route has no static output.
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ portal: string }> },
): Promise<NextResponse> {
  const { portal: rawPortal } = await params;

  // A path segment is attacker-controlled text. Narrowing it to a known portal
  // here is what lets everything downstream — the throttle key, the backend
  // URL — treat it as trusted.
  if (!isPortalId(rawPortal)) {
    return jsonError(errorMessages.unexpected, 404);
  }

  const portal: PortalId = rawPortal;
  const clientKey = clientKeyFromHeaders(request.headers);

  // Throttled per portal as well as per client: a shop-floor till and the
  // owner's laptop can share one public IP, and a cashier fumbling their
  // password should not lock the owner out of the management portal.
  const throttleKey = `login:${portal}:${clientKey}`;
  const limit = checkRateLimit(throttleKey);

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
    const session = await authenticateUser(portal, parsed.data);

    /*
     * Belt and braces: the account the backend just authenticated must actually
     * belong to the portal it was asked about.
     *
     * The backend already refuses this and is the authority. This exists
     * because of what happens when it does not — which is not hypothetical: a
     * service still running an older build accepted an administrator at the
     * till, this route set the cookie, and the browser then landed on a till
     * page that immediately redirected the owner to the dashboard. Signing in
     * at the cashier page and arriving at the admin portal is a baffling
     * outcome, and it happened without a single error anywhere.
     *
     * Refusing here means the worst case is a clear message instead of a
     * session on the wrong side of the shop. Note the ordering: no cookie has
     * been set at this point, so there is nothing to undo.
     */
    if (!portalAccepts(portal, session.user.role)) {
      console.error(
        `[auth] Backend authenticated a ${session.user.role} at the ${portal} portal;` +
          " refusing to open a session. Check that the API is running the current build.",
      );
      return jsonError(
        session.user.role === "ADMIN"
          ? errorMessages.wrongPortalAdminAccount
          : errorMessages.wrongPortalCashierAccount,
        403,
      );
    }

    // A genuine sign-in clears the throttle so one user's typo streak does not
    // lock them out after they succeed.
    resetRateLimit(throttleKey);

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
      // 503 and 403 are passed through as themselves: the first says the
      // backend is unreachable, the second that the credentials were accepted
      // and the account still cannot be used. Everything else is reported as
      // 401, so a refused sign-in cannot be told apart from an unknown user.
      const status =
        error.status === 503 || error.status === 403 ? error.status : 401;
      return jsonError(error.message, status);
    }

    console.error(`[auth] Unhandled error during ${portal} login:`, error);
    return jsonError(errorMessages.unexpected, 500);
  }
}

/**
 * Which role each portal is for.
 *
 * <p>One role per portal, deliberately: the shop asked for the till and the
 * management portal kept apart, so an administrator cannot sign in at the
 * counter and a cashier cannot sign in to the portal.
 */
function portalAccepts(portal: PortalId, role: "ADMIN" | "CASHIER"): boolean {
  return portal === "admin" ? role === "ADMIN" : role === "CASHIER";
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
