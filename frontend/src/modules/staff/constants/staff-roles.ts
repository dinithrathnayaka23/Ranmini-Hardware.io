import type { SelectOption } from "@/shared/components/ui/select-field";

/**
 * Roles that can be assigned when onboarding a staff member.
 *
 * The values are the identifiers the backend is expected to store; the labels
 * are what the shop floor calls them. Keeping both here means renaming a role
 * in the UI never silently changes what is persisted.
 */
export const staffRoles = [
  { value: "CASHIER", label: "Cashier" },
  { value: "STOREKEEPER", label: "Storekeeper" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMINISTRATOR", label: "Administrator" },
] as const satisfies readonly SelectOption[];

export type StaffRole = (typeof staffRoles)[number]["value"];

export const staffRoleValues = staffRoles.map((role) => role.value) as [
  StaffRole,
  ...StaffRole[],
];
