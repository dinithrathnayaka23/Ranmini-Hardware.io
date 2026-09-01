import { z } from "zod";

/**
 * Validation for the two profile forms.
 *
 * Shared: the browser uses these for immediate feedback and the Server Action
 * re-parses with the very same rules. An action is reachable over HTTP like any
 * endpoint, so the browser's copy is a convenience and the server's is the
 * control.
 */

export const profileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Enter your full name." })
    .max(120, { message: "Name must be at most 120 characters." }),

  // Optional, but a value that is present has to be a real address. An empty
  // string is normalised away rather than rejected, so clearing the field works.
  email: z
    .string()
    .trim()
    .max(160, { message: "Email must be at most 160 characters." })
    .email({ message: "Enter a valid email address." })
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .max(24, { message: "Contact number must be at most 24 characters." })
    .regex(/^[0-9+()\s-]*$/, {
      message: "Only digits, spaces and + ( ) - are allowed.",
    })
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Enter your current password." }),

    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .max(128, { message: "Password must be at most 128 characters." }),

    confirmPassword: z.string().min(1, { message: "Repeat the new password." }),
  })
  // Checked here as well as being sent, because a mistyped confirmation is the
  // one password error the server cannot detect — both fields look valid to it.
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "The new password must be different from the current one.",
    path: ["newPassword"],
  });

export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
