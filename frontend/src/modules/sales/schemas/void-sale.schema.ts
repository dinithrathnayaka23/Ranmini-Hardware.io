import { z } from "zod";

/**
 * Validation for cancelling a sale.
 *
 * <p>One field, and it is required. The API demands a reason too — this is the
 * courtesy copy that says so beside the box rather than after a rejected save.
 *
 * <p>A minimum length beyond "not empty" is deliberate: "x" satisfies a blank
 * check and tells the next person nothing. Ten characters is about the length
 * of a real answer ("wrong item") and short enough not to be an obstacle.
 */
export const voidSaleSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, { message: "Say briefly why this sale is being voided." })
    .max(200, { message: "Keep the reason under 200 characters." }),
});

export type VoidSaleValues = z.infer<typeof voidSaleSchema>;
