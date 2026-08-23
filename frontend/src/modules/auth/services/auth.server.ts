import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/shared/lib/env";
import {
  ApiError,
  errorMessages,
  messageForStatus,
} from "@/shared/lib/http-error";

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
    email: z.string(),
    role: z.string().min(1),
  }),
});

const LOGIN_ENDPOINT = "/api/v1/auth/login";

/**
 * Exchanges admin credentials for a token pair.
 *
 * @throws {ApiError} with copy that is already safe to render to the user.
 */
export async function authenticateAdmin(
  credentials: LoginCredentials,
): Promise<BackendLoginResponse> {
  const { API_BASE_URL, API_TIMEOUT_MS } = getServerEnv();

  // An unbounded fetch would let a stalled backend hold this request open and
  // exhaust the Node server's connection pool.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${LOGIN_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // `rememberMe` is a browser-session concern and is deliberately NOT sent
      // to the backend: token lifetime stays entirely the backend's decision.
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
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
