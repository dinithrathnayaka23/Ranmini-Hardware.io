import type { StaffMember } from "../types/staff.types";

/**
 * PLACEHOLDER DATA — replace with the record from the Spring Boot API.
 *
 * Expected endpoints, once they exist:
 *   GET   /api/v1/staff            -> staffMembers
 *   PATCH /api/v1/staff/{id}       -> profile updates
 *   PUT   /api/v1/staff/{id}/password -> password reset
 *
 * The shop runs with one cashier today, so this is a single-entry list. The
 * screen reads the first entry; adding a second employee later means adding a
 * row here (and a list view), not reworking the components.
 */
export const staffMembers: StaffMember[] = [
  {
    id: "STF-0001",
    fullName: "Kasun Perera",
    username: "k.perera",
    email: "kasun@ranminihardware.lk",
    phone: "+94 71 234 5678",
    role: "CASHIER",
    status: "ACTIVE",
    joinedOn: "2024-03-12",
    joinedLabel: "12 March 2024",
    lastActive: "Clocked in 2 hours ago",
  },
];
