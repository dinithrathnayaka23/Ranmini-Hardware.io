import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/shared/lib/env";
import {
  ApiError,
  errorMessages,
  messageForStatus,
} from "@/shared/lib/http-error";

import type { PortalId } from "../constants/portals";
import type { LoginCredentials } from "../schemas/login.schema";
import type { BackendLoginResponse } from "../types/auth.types";

/**
 * Server-side gateway to the Spring Boot authentication endpoint.
 *
 * This module is the ONLY place that knows the backend's address. The browser
 * talks to our own Route Handler, which calls this — so the API can live on a
 * private network and never be exposed to the public internet.
 */

/**
 * The response we are willing to accept from the backend.
 *
 * Parsing rather than casting means a contract drift fails here, with a clear
 * error, instead of surfacing as a blank dashboard three screens later.
 */
const backendLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresIn: z.number().int().positive(),
  user: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    fullName: z.string(),
    // An email address is optional on a staff record — the admin portal's
    // quick-add form creates cashiers without one — so the backend legitimately
    // sends null here. Requiring a string made every such account fail this
    // parse and be reported to the user as an unexpected server error.
    email: z.string().nullish().transform((value) => value ?? null),
    // A closed set, not a free string: an unexpected role must fail here with
    // a clear message rather than flow into the UI as an unhandled branch.
    role: z.enum(["ADMIN", "CASHIER"]),
    // Listed even though nothing on the login path reads it: zod drops keys a
    // schema does not name, so leaving it out would silently strip the avatar
    // stamp out of the profile this function returns.
    avatarVersion: z
      .string()
      .nullish()
      .transform((value) => value ?? null),
  }),
});

/**
 * One backend endpoint per portal, rather than a single endpoint told which
 * role to grant.
 *
 * This is the crux of keeping the two portals apart. Because the path is
 * chosen from a closed map keyed by an already-validated `PortalId`, the
 * browser can ask to be authenticated as a cashier or as an admin, but the
 * decision of whether those credentials qualify stays entirely with the Spring
 * Boot service. A cashier posting to the admin endpoint simply fails there.
 *
 * BACKEND CONTRACT: both endpoints must reject credentials belonging to the
 * other role with 401 — returning a valid token for a cashier on the admin
 * endpoint would defeat this split.
 */
const LOGIN_ENDPOINTS: Record<PortalId, string> = {
  admin: "/api/v1/auth/admin/login",
  cashier: "/api/v1/auth/cashier/login",
};

/**
 * Exchanges credentials for a token pair against the given portal's endpoint.
 *
 * @throws {ApiError} with copy that is already safe to render to the user.
 */
export async function authenticateUser(
  portal: PortalId,
  credentials: LoginCredentials,
): Promise<BackendLoginResponse> {
  const { API_BASE_URL, API_TIMEOUT_MS } = getServerEnv();

  // An unbounded fetch would let a stalled backend hold this request open and
  // exhaust the Node server's connection pool.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}${LOGIN_ENDPOINTS[portal]}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // `rememberMe` is a browser-session concern and is deliberately NOT
        // sent to the backend: token lifetime stays entirely the backend's
        // decision. The portal is not sent either — it is already expressed by
        // the endpoint chosen above.
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
        cache: "no-store",
        signal: controller.signal,
      },
    );
  } catch {
    // Covers DNS failures, connection refused and the abort above. The reason
    // is not echoed to the user — it would disclose internal infrastructure.
    throw new ApiError(errorMessages.network, 503);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ApiError(messageForStatus(response.status), response.status);
  }

  const parsed = backendLoginResponseSchema.safeParse(
    await response.json().catch(() => null),
  );

  if (!parsed.success) {
    // Log for operators, stay vague for the user.
    console.error(
      "[auth] Unexpected login response shape from backend:",
      parsed.error.issues,
    );
    throw new ApiError(errorMessages.unexpected, 502);
  }

  return parsed.data;
}
