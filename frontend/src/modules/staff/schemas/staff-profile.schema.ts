import { z } from "zod";

import { staffRoleValues } from "../constants/staff-roles";

/**
 * Validation for editing a staff member's profile.
 *
 * As everywhere else in this app, the schema is written to be shared: the
 * browser uses it for immediate feedback and whichever route handler forwards
 * to the backend must re-validate with the same rules rather than trusting the
 * client.
 */
export const staffProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Enter the staff member's full name." })
    .max(80, { message: "Name must be at most 80 characters." }),

  // Matches the sign-in rules, since this is the username they log in with.
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(64, { message: "Username must be at most 64 characters." })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: "Only letters, numbers, dots, underscores and hyphens.",
    }),

  email: z
    .string()
    .trim()
    .min(1, { message: "Enter an email address." })
    .max(120, { message: "Email must be at most 120 characters." })
    .email({ message: "Enter a valid email address." }),

  // Deliberately permissive: Sri Lankan numbers are written several ways, and
  // rejecting a valid format the shop actually uses is worse than accepting a
  // loose one the backend can normalise.
  phone: z
    .string()
    .trim()
    .min(7, { message: "Enter a contact number." })
    .max(24, { message: "Contact number must be at most 24 characters." })
    .regex(/^[0-9+()\s-]+$/, {
      message: "Only digits, spaces and + ( ) - are allowed.",
    }),

  role: z.enum(staffRoleValues, { message: "Select a role." }),

  status: z.enum(["ACTIVE", "INACTIVE"], { message: "Select a status." }),
});

export type StaffProfileValues = z.infer<typeof staffProfileSchema>;

/**
 * Validation for resetting a staff member's password.
 *
 * Kept separate from the profile schema on purpose: a password change is a
 * different kind of action with different consequences, and mixing it into the
 * profile form makes it far too easy to change a credential by accident while
 * correcting a phone number.
 */
export const staffPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .max(128, { message: "Password must be at most 128 characters." }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Both passwords must match.",
    // Report against the confirmation field, which is the one to correct.
    path: ["confirmPassword"],
  });

export type StaffPasswordValues = z.infer<typeof staffPasswordSchema>;
