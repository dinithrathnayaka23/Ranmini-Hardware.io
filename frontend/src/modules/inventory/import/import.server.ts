import "server-only";

import { NextResponse } from "next/server";

import { getSession } from "@/modules/auth/services/session.server";
import { apiFetch, apiPostText } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import { MAX_IMPORT_BYTES } from "./import.types";

/**
 * The import routes' shared plumbing: who may call them, and how a spreadsheet
 * is passed on to the backend.
 *
 * <p>Route handlers rather than Server Actions because a Server Action's body
 * is capped at one megabyte, and a catalogue of thirty thousand products is
 * several.
 */

/** Checking thirty thousand rows is slower than an ordinary request. */
const PREVIEW_TIMEOUT_MS = 120_000;

/** Null when the caller may import, otherwise the response to send instead. */
export async function refuseUnlessAdmin(): Promise<NextResponse | null> {
  const user = await getSession("admin");
  if (!user || user.role !== "ADMIN" || user.passwordChangeRequired) {
    return json({ message: "Please sign in again." }, 401);
  }
  return null;
}

/**
 * Sends the uploaded file to the backend and relays its answer.
 *
 * <p>The size is checked here as well as by the backend, so an oversized
 * upload is refused before it is copied onward.
 */
export async function forwardCsv(request: Request, path: string): Promise<NextResponse> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_IMPORT_BYTES) return tooLarge();

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_IMPORT_BYTES) return tooLarge();
  if (body.trim() === "") return json({ message: "The file is empty." }, 400);

  try {
    const result = await apiPostText<unknown>(path, body, "text/csv", "admin", PREVIEW_TIMEOUT_MS);
    return json(result, path.endsWith("/preview") ? 200 : 202);
  } catch (error) {
    return failure(error);
  }
}

/** Relays a GET for an import's progress. */
export async function forwardStatus(id: string): Promise<NextResponse> {
  try {
    return json(await apiFetch<unknown>(`/api/v1/inventory/import/${id}`, { session: "admin" }));
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return json({ message: error.message }, error.status >= 400 && error.status < 600 ? error.status : 502);
  }
  console.error("[inventory] Import request failed:", error);
  return json({ message: errorMessages.unexpected }, 502);
}

function tooLarge(): NextResponse {
  return json(
    { message: "The file is larger than 12 MB. Split it into smaller files and import them one at a time." },
    413,
  );
}

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
