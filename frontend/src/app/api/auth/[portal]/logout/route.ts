import { NextResponse } from "next/server";

import { isPortalId } from "@/modules/auth/constants/portals";
import { baseAuthCookieOptions, sessionCookies } from "@/shared/config/cookies";

/**
 * POST /api/auth/{portal}/logout — ends the session at one portal.
 *
 * <p>Because the cookies are httpOnly, the browser cannot delete them itself;
 * expiring them has to happen here. The attributes must match the ones used
 * when the cookies were set, or the browser will keep the originals.
 *
 * <p><b>One portal, not both.</b> This used to clear every session cookie there
 * was, which was correct when there was only one pair — and became a way to
 * sign a cashier out of a sale in progress from the other side of the shop the
 * moment the two portals got their own. Signing out of the portal now ends the
 * portal's session and leaves the till exactly as it was.
 *
 * <p>The portal travels in the URL, mirroring the sign-in route, so it is known
 * from the path rather than from a body this endpoint does not need to read.
 */
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ portal: string }> },
): Promise<NextResponse> {
  const { portal } = await params;

  // A path segment is attacker-controlled text. Narrowing it to a known portal
  // is what makes it safe to index the cookie table with it below.
  if (!isPortalId(portal)) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const response = NextResponse.json({ success: true }, { status: 200 });

  for (const name of Object.values(sessionCookies[portal])) {
    response.cookies.set(name, "", { ...baseAuthCookieOptions, maxAge: 0 });
  }

  return response;
}
