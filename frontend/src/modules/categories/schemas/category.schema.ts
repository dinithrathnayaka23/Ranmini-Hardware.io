import { z } from "zod";

/**
 * Validation for category names.
 *
 * <p>Every bound mirrors `CategoryController` on the backend, which is the
 * check that actually decides what gets stored — a Server Action is reachable
 * over HTTP like any endpoint, so these rules are a courtesy to the person
 * typing, not a control.
 */
export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter a category name." })
  .max(80, { message: "Name must be at most 80 characters." })
  // The backend builds the slug by stripping everything that is not an ASCII
  // letter or digit, and rejects a name that leaves nothing behind. Catching
  // that here turns a 400 into a message beside the field.
  .refine((name) => /[a-z0-9]/i.test(name), {
    message: "The name must contain at least one letter or digit.",
  });

/**
 * Identifiers arriving from the browser.
 *
 * <p>Bounded before they are ever interpolated into a request path: a Server
 * Action is a public endpoint, and an unchecked id is how a crafted value
 * escapes its path segment and addresses something else entirely.
 */
export const categoryIdSchema = z.string().trim().min(1).max(64);

export const categoryFormSchema = z.object({ name: categoryNameSchema });

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
