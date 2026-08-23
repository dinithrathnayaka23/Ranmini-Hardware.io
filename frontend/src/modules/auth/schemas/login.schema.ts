import { z } from "zod";

/**
 * Validation rules for the admin sign-in form.
 *
 * This schema is intentionally shared: the browser uses it for instant
 * feedback, and the Route Handler re-validates the parsed body with the very
 * same rules. Client-side validation is a convenience, never a control —
 * anyone can post directly to the endpoint.
 */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(64, { message: "Username must be at most 64 characters." })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: "Only letters, numbers, dots, underscores and hyphens.",
    }),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    // Capped so an oversized payload cannot be used to burn CPU on the
    // backend's password hashing routine.
    .max(128, { message: "Password must be at most 128 characters." }),

  rememberMe: z.boolean().default(false),
});

/** Form values as typed by the user (before defaults are applied). */
export type LoginFormValues = z.input<typeof loginSchema>;

/** Validated credentials, safe to forward to the backend. */
export type LoginCredentials = z.output<typeof loginSchema>;
