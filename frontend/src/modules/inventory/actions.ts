"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch, apiFetchMultipart } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import { productSchema, stockAdjustmentSchema } from "./schemas/product.schema";

/**
 * Catalogue mutations from the admin portal.
 *
 * <p>Server Actions rather than route handlers: the session token is in an
 * httpOnly cookie the browser cannot read, so the call has to be made on the
 * server regardless, and an action keeps that from becoming a hand-written
 * endpoint per mutation.
 *
 * <p>Every one of them ends by dropping the same caches, through
 * {@link refreshCatalogue} — a product write changes the table, the summary
 * cards above it and the dashboard's low-stock panel, and forgetting one of
 * those is how a screen ends up half a minute behind the shelf.
 */

export type InventoryActionResult =
  | { success: true; message: string; productId?: string }
  | { success: false; message: string };

/** What the API sends back after a write; only the id is used here. */
interface ProductWriteResponse {
  id: string;
  name: string;
}

/**
 * Creates a product.
 *
 * <p>Re-validates with the same schema the form used, because a Server Action
 * is reachable over HTTP like any endpoint — and the backend validates a third
 * time, which is the check that actually decides.
 *
 * <p>Returns the new product's id so the form can attach a photograph to it. The
 * picture is a second request on purpose: a single multipart call carrying both
 * would have to invent an id before the product was validated, and would leave
 * an orphaned image behind every time the product was rejected.
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
    const created = await apiFetch<ProductWriteResponse>("/api/v1/inventory/products", {
      method: "POST",
      session: "admin",
      body: toRequestBody(product),
    });

    await refreshCatalogue();

    return {
      success: true,
      message: `${product.name} has been added to the catalogue.`,
      productId: created.id,
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Updates a product's details.
 *
 * <p>Notably not its stock. Correcting stock is a movement with a reason — a
 * delivery, a stocktake, breakage — and letting a plain edit set it would
 * silently overwrite a sale that landed a moment earlier. The form's opening
 * stock field is disabled in edit mode for the same reason.
 */
export async function updateProduct(
  id: string,
  values: unknown,
): Promise<InventoryActionResult> {
  const parsed = productSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const product = parsed.data;

  try {
    await apiFetch(`/api/v1/inventory/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      session: "admin",
      body: toRequestBody(product),
    });

    await refreshCatalogue(id);
    return { success: true, message: `${product.name} has been updated.`, productId: id };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Withdraws a product from sale.
 *
 * <p>Called "delete" on screen because that is what a shopkeeper means, but
 * nothing is removed: last year's receipts reference this product, and a receipt
 * that cannot name what was sold is worthless to the shop and to an auditor.
 * The API deactivates it, the till stops offering it, and it can be brought
 * back.
 */
export async function deactivateProduct(id: string): Promise<InventoryActionResult> {
  try {
    const product = await apiFetch<ProductWriteResponse>(
      `/api/v1/inventory/products/${encodeURIComponent(id)}`,
      { method: "DELETE", session: "admin" },
    );

    await refreshCatalogue(id);
    return {
      success: true,
      message: `${product.name} has been withdrawn from sale. Its sales history is unchanged.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function reactivateProduct(id: string): Promise<InventoryActionResult> {
  try {
    const product = await apiFetch<ProductWriteResponse>(
      `/api/v1/inventory/products/${encodeURIComponent(id)}/reactivate`,
      { method: "POST", session: "admin" },
    );

    await refreshCatalogue(id);
    return { success: true, message: `${product.name} is on sale again.` };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Records a stock movement.
 *
 * <p>A signed delta with a reason, never a new absolute figure. "We took forty
 * more bags" is what actually happened, and a delta cannot overwrite a sale that
 * landed between the shopkeeper reading the screen and pressing save. The API
 * applies it through the same atomic update the till uses.
 *
 * <p>A delivery may also carry what it cost, which is what moves the product's
 * buying price to the weighted average of the stock now on the shelf.
 */
export async function adjustStock(
  id: string,
  values: unknown,
): Promise<InventoryActionResult> {
  const parsed = stockAdjustmentSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const { delta, reason, unitCost } = parsed.data;

  try {
    const product = await apiFetch<ProductWriteResponse & { stock: number }>(
      `/api/v1/inventory/products/${encodeURIComponent(id)}/stock`,
      {
        method: "POST",
        session: "admin",
        // Null rather than undefined: the API takes an explicit absence to mean
        // "this movement was not a purchase, leave the cost alone".
        body: { delta, reason, unitCost: unitCost ?? null },
      },
    );

    await refreshCatalogue(id);

    return {
      success: true,
      message: `${product.name} is now at ${product.stock} in stock.`,
    };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Attaches a photograph to a product.
 *
 * <p>Takes {@link FormData} rather than bytes: the file never has to be read
 * into this action's memory or re-encoded, it is simply forwarded. The API
 * checks the declared type against an allowlist and the bytes against the magic
 * number that type implies, which is the check that actually decides.
 */
export async function uploadProductImage(
  id: string,
  data: FormData,
): Promise<InventoryActionResult> {
  try {
    await apiFetchMultipart(
      `/api/v1/inventory/products/${encodeURIComponent(id)}/image`,
      data,
      "admin",
    );

    await refreshCatalogue(id);
    return { success: true, message: "Photograph saved.", productId: id };
  } catch (error) {
    return failure(error);
  }
}

export async function removeProductImage(id: string): Promise<InventoryActionResult> {
  try {
    await apiFetch(`/api/v1/inventory/products/${encodeURIComponent(id)}/image`, {
      method: "DELETE",
      session: "admin",
    });

    await refreshCatalogue(id);
    return { success: true, message: "Photograph removed." };
  } catch (error) {
    return failure(error);
  }
}

/**
 * The request body the product endpoints expect.
 *
 * <p>Shared by create and update so the two cannot drift — the API takes the
 * same shape for both, and a field added to one and forgotten in the other
 * would silently blank itself on the next edit.
 *
 * <p>No image field: a photograph is uploaded as bytes, not named by a path the
 * client chose.
 */
function toRequestBody(product: {
  sku: string;
  name: string;
  brand: string;
  categoryId: string;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  openingStock: number;
  reorderLevel: number;
}) {
  return {
    // Upper-cased here as well as on the backend, so a duplicate-SKU message
    // names the code the way the catalogue actually holds it.
    sku: product.sku.toUpperCase(),
    name: product.name,
    // An empty field means "not recorded", not the empty string. The API stores
    // null, and the till's card layout depends on the difference.
    brand: product.brand || null,
    categoryId: product.categoryId,
    // Null lets the backend apply its own default of "pcs" rather than this
    // form having a second opinion about what that default is.
    unit: product.unit || null,
    buyingPrice: product.buyingPrice,
    sellingPrice: product.sellingPrice,
    openingStock: product.openingStock,
    reorderLevel: product.reorderLevel,
  };
}

/**
 * Drops everything a catalogue write invalidates.
 *
 * <p>The summary cards and the dashboard read through a thirty-second cache, so
 * sweeping the paths alone would leave both half a minute behind a save.
 * Dropping the tags is what makes a change show up in the counts at once.
 *
 * <p>The till is deliberately absent: it reads products with `no-store`, so its
 * next load already sees the change.
 */
async function refreshCatalogue(productId?: string): Promise<void> {
  revalidateTag("inventory-summary");
  revalidateTag("dashboard");
  revalidatePath(routes.adminInventory);
  revalidatePath(routes.adminDashboard);

  if (productId) {
    revalidatePath(routes.adminInventoryEdit(productId));
  }
}

/** One place that decides what a failed write says to the user. */
function failure(error: unknown): InventoryActionResult {
  if (error instanceof ApiError) return { success: false, message: error.message };
  return { success: false, message: errorMessages.unexpected };
}
