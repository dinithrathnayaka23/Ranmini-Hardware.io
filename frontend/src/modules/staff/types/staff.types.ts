import type { Accent } from "@/shared/lib/accent";

import type { StaffRole } from "../constants/staff-roles";

/**
 * A staff member's record.
 *
 * The shop currently runs with a single cashier, so this screen manages one
 * person rather than a directory. The type is still written for a list — the
 * page just renders one of them — so growing to a second employee is a data
 * change rather than a rewrite.
 */
export type StaffStatus = "ACTIVE" | "INACTIVE";

export interface StaffMember {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  /** ISO date the person joined, used for the "since" line. */
  joinedOn: string;
  /** Pre-formatted for display, e.g. "12 March 2024". */
  joinedLabel: string;
  /** Human-readable recency, e.g. "Clocked in 2 hours ago". */
  lastActive: string;
}

/** How each status is labelled and coloured wherever it appears. */
export const staffStatusPresentation: Record<
  StaffStatus,
  { label: string; accent: Accent }
> = {
  ACTIVE: { label: "Active", accent: "success" },
  INACTIVE: { label: "Inactive", accent: "neutral" },
};
