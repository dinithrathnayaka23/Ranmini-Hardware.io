import { NextResponse } from "next/server";

import { getSession } from "@/modules/auth/services/session.server";
import { apiFetchRaw } from "@/shared/lib/api.server";

/**
 * GET /api/inventory/export — the catalogue as a PDF stock sheet.
 *
 * <p>A proxy rather than a Server Action, because the browser has to *receive a
 * file*: an action returns a value to React, while this needs to become a
 * download with the filename the API chose. A plain link to this route is all
 * the button has to be, which also means it works with a middle-click and can
 * be bookmarked.
 *
 * <p>The API cannot be linked to directly — the session lives in an httpOnly
 * cookie the browser cannot attach to a cross-origin request, and the API is
 * meant to sit on a private network. This route attaches the token server-side
 * and streams the bytes back.
 *
 * <p><b>Only known filters are forwarded.</b> The query string is rebuilt from
 * an allowlist rather than passed through: appending arbitrary caller-supplied
 * text to an upstream URL is how a proxy becomes a way to reach endpoints it was
 * never meant to.
 */
export const dynamic = "force-dynamic";

/** The inventory listing's own filters, and nothing else. */
const FORWARDED = ["q", "categoryId", "status", "activeOnly"] as const;

export async function GET(request: Request) {
  // A management-portal download, so the portal's session and no other.
  const user = await getSession("admin");
  if (!user) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  const requested = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();

  for (const key of FORWARDED) {
    const value = requested.get(key);
    if (value !== null && value !== "") forwarded.set(key, value);
  }

  const query = forwarded.toString();
  const response = await apiFetchRaw(
    `/api/v1/inventory/export${query ? `?${query}` : ""}`,
    "admin",
  );

  if (!response.ok) {
    // Rendered as a page rather than a file: the browser is navigating to this
    // URL, so a JSON error body would be shown as raw text in the address bar's
    // tab. Plain text at least reads as a sentence.
    return new NextResponse("The stock sheet could not be generated.", {
      status: response.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // The API names the file with today's date in it; keeping its header is
      // what stops a folder of downloads all called "export.pdf".
      "Content-Disposition":
        response.headers.get("Content-Disposition") ??
        'attachment; filename="inventory.pdf"',
      // Stock figures move constantly, and a cached stock sheet is a wrong one.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
