import { NextResponse } from "next/server";

import { baseAuthCookieOptions, cookieNames } from "@/shared/config/cookies";

/**
 * POST /api/auth/logout — clears the session cookies.
 *
 * Because the cookies are httpOnly, the browser cannot delete them itself;
 * expiring them has to happen here. The attributes must match the ones used
 * when the cookies were set, or the browser will keep the originals.
 */
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true }, { status: 200 });

  for (const name of Object.values(cookieNames)) {
    response.cookies.set(name, "", { ...baseAuthCookieOptions, maxAge: 0 });
  }

  return response;
}
