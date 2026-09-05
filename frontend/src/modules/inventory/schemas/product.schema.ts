import { z } from "zod";

/**
 * Validation for the add-product form.
 *
 * <p>Every bound mirrors `ProductDtos.Request` on the backend, which is the
 * check that actually decides what gets stored. These rules exist so a
 * shopkeeper is told about a typo beside the field rather than by a rejected
 * save — they are a courtesy, not a control.
 */

/**
 * Whether a price has at most two decimal places.
 *
 * <p>Written this way rather than as `multipleOf(0.01)` because binary floating
 * point cannot represent 0.01: `12.34 * 100` is 1234.0000000000002, and a naive
 * check rejects perfectly ordinary prices. Rounding the product to six places
 * first absorbs that error while still catching a genuine third decimal.
 */
function hasAtMostTwoDecimals(value: number): boolean {
  return Number.isInteger(Number((value * 100).toFixed(6)));
}

/**
 * A money field.
 *
 * <p>The ceiling matches the backend's `@Digits(integer = 10, fraction = 2)`,
 * which exists so a slipped keypress cannot store a figure that overflows a
 * report.
 */
function money(field: string) {
  return z
    .number({ message: `Enter a ${field}.` })
    .min(0, { message: `The ${field} cannot be negative.` })
    .max(9_999_999_999.99, { message: `That ${field} is not plausible.` })
    .refine(hasAtMostTwoDecimals, {
      message: `Use at most two decimal places for the ${field}.`,
    });
}

/** A whole-number quantity field. */
function quantity(field: string, ceiling: number) {
  return z
    .number({ message: `Enter ${field}.` })
    .int({ message: `${capitalise(field)} must be a whole number.` })
    .min(0, { message: `${capitalise(field)} cannot be negative.` })
    .max(ceiling, { message: `That ${field} is not plausible.` });
}

export const productSchema = z.object({
  /**
   * The barcode or shelf code. Stored upper case by the backend, so the field
   * is displayed upper case too rather than letting the two disagree.
   */
  sku: z
    .string()
    .trim()
    .min(1, { message: "Enter a SKU." })
    .max(40, { message: "SKU must be at most 40 characters." })
    .regex(/^[A-Za-z0-9._/-]+$/, {
      message: "Use letters, digits and . _ / - only.",
    }),

  name: z
    .string()
    .trim()
    .min(1, { message: "Enter a product name." })
    .max(160, { message: "Name must be at most 160 characters." }),

  brand: z.string().trim().max(80, { message: "Brand must be at most 80 characters." }),

  categoryId: z.string().min(1, { message: "Choose a category." }),

  unit: z.string().trim().max(16, { message: "Unit must be at most 16 characters." }),

  buyingPrice: money("buying price"),
  sellingPrice: money("selling price"),

  openingStock: quantity("the opening stock", 10_000_000),
  reorderLevel: quantity("the reorder level", 1_000_000),
});

export type ProductFormValues = z.infer<typeof productSchema>;

function capitalise(text: string): string {
  const trimmed = text.replace(/^the /, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * A deliberate stock movement.
 *
 * <p>A signed delta rather than a new total, mirroring the API. "Forty more
 * bags arrived" is what happened, and a delta cannot silently overwrite a sale
 * that landed while the form was open.
 *
 * <p>Zero is rejected rather than treated as a harmless no-op: somebody typing
 * a quantity means to change something, and a form that accepted zero and did
 * nothing would look like it had worked.
 */
export const stockAdjustmentSchema = z.object({
  delta: z
    .number({ message: "Enter a quantity." })
    .int({ message: "Use a whole number of units." })
    .refine((value) => value !== 0, { message: "Enter a quantity other than zero." })
    .refine((value) => Math.abs(value) <= 1_000_000, {
      message: "That adjustment is not plausible.",
    }),

  reason: z
    .string()
    .trim()
    .min(1, { message: "Say why the stock is changing." })
    .max(120, { message: "Keep the reason under 120 characters." }),

  /**
   * What the shop paid per unit on this delivery.
   *
   * <p>Optional, because most adjustments are not purchases: breakage and
   * stocktake corrections have no price. When it is given on a positive
   * movement the backend moves the product's cost to the weighted average of
   * what is now on the shelf, which is what Settings → Business Logic promises.
   */
  unitCost: money("delivery cost").optional(),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
