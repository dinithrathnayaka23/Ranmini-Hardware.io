"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import { productSchema } from "./schemas/product.schema";

/**
 * Catalogue mutations from the admin portal.
 *
 * <p>A Server Action rather than a route handler: the session token is in an
 * httpOnly cookie the browser cannot read, so the call has to be made on the
 * server regardless, and an action keeps that from becoming a hand-written
 * endpoint per mutation.
 */

export type InventoryActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

/**
 * Creates a product.
 *
 * <p>Re-validates with the same schema the form used, because a Server Action
 * is reachable over HTTP like any endpoint — and the backend validates a third
 * time, which is the check that actually decides.
 */
export async function createProduct(values: unknown): Promise<InventoryActionResult> {
  const parsed = productSchema.safeParse(values);

  if (!parsed.success) {
    // The form renders per-field messages itself; this is the backstop for a
    // caller that did not come through the form at all.
    return { success: false, message: parsed.error.issues[0].message };
  }

  const product = parsed.data;

  try {
    await apiFetch("/api/v1/inventory/products", {
      method: "POST",
      body: {
        // Upper-cased here as well as on the backend, so a duplicate-SKU
        // message names the code the way the catalogue actually holds it.
        sku: product.sku.toUpperCase(),
        name: product.name,
        // An empty field means "not recorded", not the empty string. The API
        // stores null, and the till's card layout depends on the difference.
        brand: product.brand || null,
        categoryId: product.categoryId,
        // Null lets the backend apply its own default of "pcs" rather than
        // this form having a second opinion about what that default is.
        unit: product.unit || null,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        openingStock: product.openingStock,
        reorderLevel: product.reorderLevel,
        imageUrl: product.imageUrl || null,
      },
    });

    // The catalogue table, the four summary cards above it and the dashboard's
    // low-stock panel all count this product now. The till is not listed: it
    // reads products with `no-store`, so its next load already sees this one.
    revalidatePath(routes.adminInventory);
    revalidatePath(routes.adminDashboard);

    return {
      success: true,
      message: `${product.name} has been added to the catalogue.`,
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}
