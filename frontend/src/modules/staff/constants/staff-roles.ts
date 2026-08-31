import type { SelectOption } from "@/shared/components/ui/select-field";

/**
 * The roles a staff member can hold.
 *
 * Two, because the shop has two jobs. **Admin** is the owner and his son, with
 * identical privileges — there is deliberately no senior or junior admin.
 * **Cashier** is whoever is on the counter: they reach the till and nothing
 * else.
 *
 * The values are exactly what the backend stores, so a role chosen here is
 * persisted verbatim rather than translated.
 */
export const staffRoles = [
  { value: "CASHIER", label: "Cashier" },
  { value: "ADMIN", label: "Admin" },
] as const satisfies readonly SelectOption[];

export type StaffRole = (typeof staffRoles)[number]["value"];

export const staffRoleValues = staffRoles.map((role) => role.value) as [
  StaffRole,
  ...StaffRole[],
];

/** How each role is described where a label alone is not enough. */
export const staffRoleDescription: Record<StaffRole, string> = {
  CASHIER: "Can sign in to the till and ring up sales.",
  ADMIN: "Full access to the management portal and the till.",
};
