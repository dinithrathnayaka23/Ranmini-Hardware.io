import "server-only";

import type { UserRole } from "@/modules/auth/types/auth.types";
import { adminFetch } from "@/modules/auth/services/guarded-fetch.server";

/**
 * The signed-in person's own account.
 *
 * <p>Carries more than the session does — phone, joining date — because this is
 * the screen for editing them, and the session payload is deliberately kept
 * small since it rides along on every request.
 */
export interface MyProfile {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  joinedOn: string | null;
  lastActiveAt: string | null;
  /** Null when there is no picture; otherwise the cache-busting token. */
  avatarVersion: string | null;
}

export async function fetchMyProfile(): Promise<MyProfile> {
  const profile = // `/api/v1/profile` acts on whoever the token belongs to, so a cashier
  // could read their own record through it — but the only screen that makes
  // this call is /admin/profile, which is the portal's. If the till ever grows
  // one, it gets a cashier-session read of its own rather than borrowing this.
  await adminFetch<MyProfile>("/api/v1/profile");

  // The API omits null fields, so absent and null arrive differently. Normalised
  // here so every form below can treat them the same way.
  return {
    ...profile,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    joinedOn: profile.joinedOn ?? null,
    lastActiveAt: profile.lastActiveAt ?? null,
    avatarVersion: profile.avatarVersion ?? null,
  };
}
