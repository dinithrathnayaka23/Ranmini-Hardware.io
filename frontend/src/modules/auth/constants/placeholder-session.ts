import type { AdminProfile } from "../types/auth.types";

/**
 * PLACEHOLDER — the signed-in administrator shown in the portal chrome.
 *
 * The real profile is returned by the backend at sign-in, but the access token
 * lives in an httpOnly cookie that client code cannot read. Once the Spring
 * Boot service exposes a `GET /api/v1/auth/me` endpoint, the portal layout
 * should fetch it server-side and drop this constant entirely.
 *
 * Kept in one clearly named module so there is exactly one thing to delete.
 */
export const placeholderAdmin: AdminProfile = {
  id: "placeholder",
  username: "olitharanasinghe2003",
  fullName: "Olitha Ranasinghe",
  email: "owner@ranminihardware.lk",
  role: "Owner",
  // Drop a photo at `public/images/admin/` and point this at it, e.g.
  // "/images/admin/olitha.jpg". Left null so the portal shows initials
  // rather than a stock photograph standing in for a real person.
  avatarUrl: null,
};
