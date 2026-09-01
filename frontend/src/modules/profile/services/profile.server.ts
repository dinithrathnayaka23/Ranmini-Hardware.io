import "server-only";

import type { UserRole } from "@/modules/auth/types/auth.types";
import { apiFetch } from "@/shared/lib/api.server";

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
  const profile = await apiFetch<MyProfile>("/api/v1/profile");

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
