import { z } from "zod";

import { staffRoleValues } from "../constants/staff-roles";

/**
 * Validation for the dashboard's quick staff-onboarding form.
 *
 * As with sign-in, this schema is written to be shared: the browser uses it for
 * immediate feedback, and whichever route handler eventually forwards to the
 * backend must re-validate with the same rules rather than trusting the client.
 */
export const staffQuickAddSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Enter the staff member's full name." })
    .max(80, { message: "Name must be at most 80 characters." }),

  role: z.enum(staffRoleValues, {
    message: "Select a role.",
  }),

  // Matches the sign-in rules, since this is the username they will log in with.
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(64, { message: "Username must be at most 64 characters." })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: "Only letters, numbers, dots, underscores and hyphens.",
    }),

  initialPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .max(128, { message: "Password must be at most 128 characters." }),
});

export type StaffQuickAddValues = z.infer<typeof staffQuickAddSchema>;
