import { z } from "zod";

/**
 * Validation for the two password-recovery forms.
 *
 * <p>Shared between the browser and the Server Action that receives the values,
 * so the rules cannot drift apart. The browser's copy exists for immediate
 * feedback; the server's copy is the one that decides, because an action is
 * reachable over HTTP like any other endpoint.
 */

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Enter your email address." })
    .max(254, { message: "That address is too long." })
    .email({ message: "Enter a valid email address." }),
});

export const resetPasswordSchema = z
  .object({
    /**
     * Carried in a hidden field rather than read from the URL by the form.
     *
     * <p>The page already has it from its search params, and passing it down
     * keeps this component free of `useSearchParams`, which would drag the
     * whole route out of static prerendering.
     */
    token: z.string().min(1, { message: "This reset link is missing its token." }),

    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .max(128, { message: "Password must be at most 128 characters." }),

    confirmPassword: z.string().min(1, { message: "Repeat the new password." }),
  })
  // The one password mistake the server cannot catch: to it, two different
  // strings both look like perfectly valid passwords.
  .refine((values) => values.password === values.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
