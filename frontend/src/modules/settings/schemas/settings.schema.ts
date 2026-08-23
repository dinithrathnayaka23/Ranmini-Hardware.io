import { z } from "zod";

/**
 * Validation for every settings section.
 *
 * Grouped in one module because the four forms are variations on the same
 * task and share conventions — and as everywhere else, the browser uses these
 * for feedback while the route handler that eventually forwards to the backend
 * must re-validate with the very same rules.
 */

export const shopProfileSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, { message: "Enter the registered business name." })
    .max(120, { message: "Name must be at most 120 characters." }),

  registrationNumber: z
    .string()
    .trim()
    .min(3, { message: "Enter the business registration number." })
    .max(40, { message: "Registration number must be at most 40 characters." }),

  primaryAddress: z
    .string()
    .trim()
    .min(10, { message: "Enter the full trading address." })
    .max(240, { message: "Address must be at most 240 characters." }),

  contactEmail: z
    .string()
    .trim()
    .min(1, { message: "Enter a contact email address." })
    .email({ message: "Enter a valid email address." }),

  contactPhone: z
    .string()
    .trim()
    .min(7, { message: "Enter a contact number." })
    .max(24, { message: "Contact number must be at most 24 characters." })
    .regex(/^[0-9+()\s-]+$/, {
      message: "Only digits, spaces and + ( ) - are allowed.",
    }),
});

export const businessLogicSchema = z.object({
  // A number input hands over a string; the forms convert it with
  // react-hook-form's `valueAsNumber` so the schema sees a real number.
  taxRate: z
    .number({ message: "Enter a tax rate." })
    .min(0, { message: "Tax rate cannot be negative." })
    .max(100, { message: "Tax rate cannot exceed 100%." }),

  lowStockThreshold: z
    .number({ message: "Enter a threshold." })
    .int({ message: "Use a whole number of units." })
    .min(1, { message: "Threshold must be at least 1." })
    .max(10_000, { message: "Threshold must be at most 10,000." }),

  currencySymbol: z.enum(["Rs.", "$"], { message: "Select a currency." }),

  stockValuation: z.enum(["FIFO", "WEIGHTED_AVERAGE"], {
    message: "Select a valuation method.",
  }),
});

export const receiptsSchema = z.object({
  receiptPrefix: z
    .string()
    .trim()
    .min(1, { message: "Enter a prefix." })
    .max(10, { message: "Prefix must be at most 10 characters." })
    .regex(/^[A-Z0-9-]+$/, {
      message: "Use capital letters, digits and hyphens only.",
    }),

  footerMessage: z
    .string()
    .trim()
    .max(160, { message: "Footer must be at most 160 characters." }),

  paperSize: z.enum(["80MM", "58MM", "A4"], {
    message: "Select a paper size.",
  }),

  showLogo: z.boolean(),
});

export const securitySchema = z.object({
  sessionTimeoutMinutes: z.enum(["15", "30", "60", "240"], {
    message: "Select a session timeout.",
  }),

  minPasswordLength: z
    .number({ message: "Enter a minimum length." })
    .int({ message: "Use a whole number." })
    // Below 8 is not a preference the shop gets to have — it is the floor the
    // sign-in and staff forms already enforce, and letting settings undercut
    // them would silently weaken every password in the system.
    .min(8, { message: "Minimum length cannot be below 8 characters." })
    .max(64, { message: "Minimum length must be at most 64 characters." }),

  lockoutThreshold: z
    .number({ message: "Enter a lockout threshold." })
    .int({ message: "Use a whole number." })
    .min(3, { message: "Allow at least 3 attempts." })
    .max(20, { message: "Allow at most 20 attempts." }),

  auditLogEnabled: z.boolean(),
});

export type ShopProfileValues = z.infer<typeof shopProfileSchema>;
export type BusinessLogicValues = z.infer<typeof businessLogicSchema>;
export type ReceiptsValues = z.infer<typeof receiptsSchema>;
export type SecurityValues = z.infer<typeof securitySchema>;
