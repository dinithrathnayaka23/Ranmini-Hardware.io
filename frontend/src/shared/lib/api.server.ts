import "server-only";

import { cookies } from "next/headers";

import { cookieNames } from "@/shared/config/cookies";
import { ApiError, errorMessages, messageForStatus } from "@/shared/lib/http-error";

import { getServerEnv } from "./env";

/**
 * The one way this app talks to the Spring Boot API.
 *
 * <p>Server-side only, by construction: the `server-only` import above breaks
 * the build if a Client Component ever imports it. That matters because this is
 * where the session token is attached, and a token that reaches the browser
 * bundle is a token an XSS payload can read. The cookie holding it is httpOnly
 * precisely so that JavaScript cannot; fetching through here keeps that true.
 *
 * Every call is unauthenticated-by-default and opts into the session, rather
 * than the reverse, so a public endpoint cannot accidentally leak a token to a
 * service that does not need one.
 */

interface RequestOptions {
  /** HTTP method. Defaults to GET. */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body, serialised for you. */
  body?: unknown;
  /**
   * Attach the signed-in user's token. Defaults to true, because nearly every
   * endpoint needs it and forgetting it fails loudly rather than silently.
   */
  authenticated?: boolean;
  /**
   * Next.js cache behaviour. Defaults to no-store: this is a point-of-sale
   * system, and a cached stock level is a wrong stock level.
   */
  cache?: RequestCache;
  /** Revalidation window in seconds, for the few reads that tolerate staleness. */
  revalidate?: number;
  /** Cache tags, so a mutation can invalidate exactly what it changed. */
  tags?: string[];
}

/**
 * Calls the backend and returns the parsed body.
 *
 * <p><b>A null field arrives as `undefined`, not `null`.</b> The API is
 * configured with `default-property-inclusion: non_null`, so it omits null
 * properties from its JSON rather than sending them — the key is simply not
 * there. Type an optional field as `field?: T | null`, and test it with `??` or
 * a truthy check rather than `=== null`.
 *
 * <p>This is written down because getting it wrong is silent until it is not:
 * a receipt tested `amountTendered === null`, which is false for undefined, and
 * printed `amount(undefined)`. That threw, and the thrown error unmounted the
 * whole till in front of a customer.
 *
 * @throws {ApiError} with a message already safe to show a user.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { API_BASE_URL, API_TIMEOUT_MS } = getServerEnv();
  const { method = "GET", body, authenticated = true, cache, revalidate, tags } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (authenticated) {
    const token = (await cookies()).get(cookieNames.accessToken)?.value;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // An unbounded fetch lets a stalled backend hold a Next.js request open and
  // exhaust the server's connection pool.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: revalidate === undefined ? (cache ?? "no-store") : undefined,
      next: revalidate === undefined ? (tags ? { tags } : undefined) : { revalidate, tags },
    });
  } catch {
    // Covers DNS failure, connection refused, and the abort above. The reason
    // is never echoed to the user: it would disclose internal infrastructure.
    throw new ApiError(errorMessages.network, 503);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ApiError(await readMessage(response), response.status);
  }

  // 204 and friends have no body to parse.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * A read that returns null instead of throwing when the resource is missing.
 *
 * Used where an absent record is an ordinary outcome — a dashboard panel with
 * nothing to show — rather than a failure worth interrupting the page for.
 */
export async function apiFetchOrNull<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Pulls the backend's message out of an error response.
 *
 * The API returns one error envelope everywhere, so its `message` is already
 * written for a person. Anything unparseable falls back to vetted copy keyed on
 * the status, rather than showing the user a raw response body.
 */
async function readMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
    ) {
      return (payload as { message: string }).message;
    }
  } catch {
    // Fall through to the status-based message.
  }
  return messageForStatus(response.status);
}

/**
 * Calls the backend and hands back the raw {@link Response}.
 *
 * <p>For the few endpoints that do not return JSON — an avatar's bytes — where
 * the caller needs the status, the content type and the body as they came.
 * Everything else should use {@link apiFetch}, which parses and maps errors.
 */
export async function apiFetchRaw(path: string): Promise<Response> {
  const { API_BASE_URL, API_TIMEOUT_MS } = getServerEnv();

  const headers: Record<string, string> = {};
  const token = (await cookies()).get(cookieNames.accessToken)?.value;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(errorMessages.network, 503);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Posts multipart form data — a file upload — to the backend.
 *
 * <p>Kept apart from {@link apiFetch} because the Content-Type header must NOT
 * be set by hand here: the boundary is generated with the body, and setting the
 * type without it produces a request the server cannot parse. Letting fetch
 * derive the header is the only way to get it right.
 */
export async function apiFetchMultipart<T>(path: string, body: FormData): Promise<T> {
  const { API_BASE_URL, API_TIMEOUT_MS } = getServerEnv();

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = (await cookies()).get(cookieNames.accessToken)?.value;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(errorMessages.network, 503);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) throw new ApiError(await readMessage(response), response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Shape of the backend's paged responses. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
  hasNext: boolean;
}
