import { NextResponse } from "next/server";

import { getActiveSession } from "@/modules/auth/services/session.server";
import { apiFetchRaw } from "@/shared/lib/api.server";

/**
 * GET /api/avatars/{staffId} — serves a profile picture to the browser.
 *
 * <p>A proxy exists because the browser cannot fetch the picture from the API
 * itself: the session token is in an httpOnly cookie it cannot read, and the
 * API will not serve an avatar unauthenticated. So the request comes here, this
 * route attaches the token server-side, and the bytes are streamed back.
 *
 * <p>Which upstream endpoint is used depends on whose picture it is. Your own
 * comes from `/profile/avatar`, which needs no id and is open to any signed-in
 * role — that is what lets a cashier's own picture load. Anybody else's comes
 * from the staff endpoint, which is administrator-only, so a cashier asking for
 * a colleague's picture is refused by the API rather than by a check here.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Whichever portal this browser is signed in to — and the request upstream is
  // then made with that same session. Taking the id from one and the token from
  // the other would ask for one person's picture with somebody else's
  // credentials.
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  const upstream =
    id === session.user.id
      ? "/api/v1/profile/avatar"
      : `/api/v1/staff/${encodeURIComponent(id)}/avatar`;

  const response = await apiFetchRaw(upstream, session.portal);

  // No picture is an ordinary state, not a failure: the Avatar component falls
  // back to initials, and it needs a plain 404 to do that.
  if (!response.ok) {
    return new NextResponse(null, { status: response.status === 404 ? 404 : 403 });
  }

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      // The caller's URL carries the version, so a changed picture is a
      // different URL and this response can never go stale. Private, because it
      // is one person's photograph and must not sit in a shared cache.
      "Cache-Control": "private, max-age=31536000, immutable",
      // The bytes were signature-checked on upload; sniffing here would make
      // that check pointless.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
