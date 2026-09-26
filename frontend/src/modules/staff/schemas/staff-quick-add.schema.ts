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

  /**
   * Optional, because many cashiers have no address to give. An address is
   * what lets a person reset a forgotten password by email; without one, they
   * ask the owner from the sign-in page instead. Blank means "none" and is sent
   * as absent, never as an empty string.
   */
  email: z
    .string()
    .trim()
    .max(160, { message: "Email must be at most 160 characters." })
    .email({ message: "Enter a valid email address." })
    .optional()
    .or(z.literal("")),

  initialPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .max(128, { message: "Password must be at most 128 characters." }),
});

export type StaffQuickAddValues = z.infer<typeof staffQuickAddSchema>;

/** An email set on an existing account from the Staff screen. Blank removes it. */
export const staffEmailSchema = z
  .string()
  .trim()
  .max(160, { message: "Email must be at most 160 characters." })
  .email({ message: "Enter a valid email address." })
  .or(z.literal(""));
