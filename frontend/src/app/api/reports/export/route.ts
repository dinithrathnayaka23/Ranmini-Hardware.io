import { NextResponse } from "next/server";

import { getSession } from "@/modules/auth/services/session.server";
import { apiFetchRaw } from "@/shared/lib/api.server";

/**
 * GET /api/reports/export — the sales and analytics report as a PDF.
 *
 * <p>Same shape as the inventory export, and for the same reasons: a download
 * has to be a navigation rather than an action's return value, the API cannot be
 * linked to directly from the browser, and only the two known parameters are
 * forwarded so this cannot be used to reach an upstream path of the caller's
 * choosing.
 *
 * <p>The dates are passed through as text and validated by the API, which parses
 * them into real dates and rejects anything else. Re-validating the format here
 * would be a second copy of a rule that has to hold in one place anyway.
 */
export const dynamic = "force-dynamic";

const FORWARDED = ["from", "to"] as const;

export async function GET(request: Request) {
  const user = await getSession();
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
    `/api/v1/reports/export${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    return new NextResponse("The report could not be generated.", {
      status: response.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ??
        'attachment; filename="sales-report.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
