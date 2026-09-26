import { NextResponse } from "next/server";

import { getActiveSession } from "@/modules/auth/services/session.server";
import { apiFetchRaw } from "@/shared/lib/api.server";

/**
 * GET /api/product-images/{productId} — serves a product photograph.
 *
 * <p>A proxy exists for the same reason the avatar one does: the browser cannot
 * fetch the picture from the API itself, because the session token is in an
 * httpOnly cookie it cannot read and the API will not serve a catalogue image
 * unauthenticated. The request comes here, this route attaches the token
 * server-side, and the bytes are streamed back.
 *
 * <p>Open to any signed-in role. A cashier needs product pictures — they are the
 * tiles on the till — and the API's own rule is the one that decides: this route
 * forwards the session and repeats whatever the API answers.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Only one value is passed on; anything else means the original.
  const thumb = new URL(request.url).searchParams.get("size") === "thumb";

  // Either portal: a cashier needs product pictures because they are the tiles
  // on the till, and an administrator needs them on the inventory screen.
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  const response = await apiFetchRaw(
    `/api/v1/inventory/products/${encodeURIComponent(id)}/image${thumb ? "?size=thumb" : ""}`,
    session.portal,
  );

  // No photograph is an ordinary state, not a failure: the card renders its own
  // neutral tile, and it needs a plain 404 to do that.
  if (!response.ok) {
    return new NextResponse(null, { status: response.status === 404 ? 404 : 403 });
  }

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      // The caller's URL carries the version stamp, so a replaced picture is a
      // different address and this response can never go stale. Private,
      // because the catalogue sits behind a sign-in.
      "Cache-Control": "private, max-age=31536000, immutable",
      // The bytes were signature-checked on upload; a browser sniffing its own
      // type would make that check pointless.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
