import "server-only";

import { adminFetch } from "@/modules/auth/services/guarded-fetch.server";
import { type PageResponse } from "@/shared/lib/api.server";

import type { StaffRole } from "../constants/staff-roles";
import type { StaffMember, StaffStatus } from "../types/staff.types";

/**
 * Staff reads for the admin screens.
 *
 * <p>The API returns the stored record; the display strings the screen wants —
 * "12 March 2024", "Clocked in 2 hours ago" — are derived here rather than
 * stored, because a formatted date is a presentation choice and a backend that
 * returns one has quietly picked a locale for everybody.
 */

interface StaffResponse {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  joinedOn: string | null;
  lastActiveAt: string | null;
  avatarVersion: string | null;
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const page = await adminFetch<PageResponse<StaffResponse>>("/api/v1/staff?size=50");
  return page.content.map(toStaffMember);
}

function toStaffMember(response: StaffResponse): StaffMember {
  return {
    id: response.id,
    fullName: response.fullName,
    username: response.username,
    email: response.email ?? "",
    phone: response.phone ?? "",
    role: response.role,
    status: response.status,
    joinedOn: response.joinedOn ?? "",
    joinedLabel: formatJoinedDate(response.joinedOn),
    lastActive: formatLastActive(response.lastActiveAt),
    avatarVersion: response.avatarVersion ?? null,
  };
}

const joinedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatJoinedDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return joinedFormatter.format(new Date(`${iso}T00:00:00Z`));
}

/**
 * "Clocked in 2 hours ago", and similar.
 *
 * <p>Rendered on the server, so it is a snapshot from page load rather than a
 * live ticker. That is the honest presentation for a value the page does not
 * poll: a relative time that silently goes stale reads as a bug the first time
 * somebody leaves the tab open over lunch.
 */
function formatLastActive(iso: string | null): string {
  if (!iso) return "Has not signed in yet";

  const elapsedMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return "Signed in just now";
  if (minutes < 60) return `Signed in ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Signed in ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Signed in ${days} day${days === 1 ? "" : "s"} ago`;

  return `Last signed in ${joinedFormatter.format(new Date(iso))}`;
}
