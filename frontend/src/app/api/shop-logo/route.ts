import { NextResponse } from "next/server";

import { getActiveSession } from "@/modules/auth/services/session.server";
import { apiFetchRaw } from "@/shared/lib/api.server";

/**
 * GET /api/shop-logo — serves the shop's logo.
 *
 * <p>A proxy for the same reason the product-photograph one is: the browser
 * cannot fetch the image from the API itself, because the session token is in
 * an httpOnly cookie it cannot read. The request comes here, this route
 * attaches the token server-side, and the bytes are streamed back.
 *
 * <p>Open to any signed-in role. A cashier needs it — the till prints it at the
 * top of the receipt — and the API's own rule is the one that decides: this
 * route forwards the session and repeats whatever the API answers.
 *
 * <p>No id in the path. There is one shop and one logo, so the version stamp
 * carried in the query string is the only thing that varies, and it is what
 * makes the immutable cache below safe.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // Either portal: the till prints this at the top of a receipt.
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  const response = await apiFetchRaw("/api/v1/settings/public/logo", session.portal);

  // No logo is an ordinary state, not a failure: the settings screen shows its
  // empty tile and the receipt simply prints without one.
  if (!response.ok) {
    return new NextResponse(null, { status: response.status === 404 ? 404 : 403 });
  }

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      // The caller's URL carries the version stamp, so a replaced logo is a
      // different address and this response can never go stale. Private,
      // because both portals sit behind a sign-in.
      "Cache-Control": "private, max-age=31536000, immutable",
      // The bytes were signature-checked on upload; a browser sniffing its own
      // type would make that check pointless.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
