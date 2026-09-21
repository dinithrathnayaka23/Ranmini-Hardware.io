"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import { voidSaleSchema } from "./schemas/void-sale.schema";
import type { Sale } from "./types/sales.types";

/**
 * Cancelling a completed sale.
 *
 * <p>The one write in this module, and the one that has to be hardest to do by
 * accident. Voiding puts the stock back on the shelf and takes the money out of
 * the day's takings, so it is a genuine correction to the ledger rather than a
 * tidy-up — which is why it demands a reason, and why the reason is stored on
 * the receipt rather than in a log somebody has to go looking for.
 */

export type SalesActionResult =
  | { success: true; message: string; sale: Sale }
  | { success: false; message: string };

export async function voidSale(
  id: string,
  values: unknown,
): Promise<SalesActionResult> {
  const parsed = voidSaleSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    const sale = await apiFetch<Sale>(
      `/api/v1/sales/${encodeURIComponent(id)}/void`,
      { method: "POST", body: { reason: parsed.data.reason }, session: "admin" },
    );

    // A void moves stock, the day's revenue and the notification feed all at
    // once, so everything that reads any of them has to be dropped. The
    // dashboard and the inventory summary sit behind a thirty-second cache;
    // without the tags, a voided sale would still be counted in today's
    // takings for half a minute after it was cancelled.
    revalidateTag("dashboard");
    revalidateTag("inventory-summary");
    revalidatePath(routes.adminReportsDaily);
    revalidatePath(routes.adminReports);
    revalidatePath(routes.adminDashboard);
    revalidatePath(routes.adminInventory);

    return {
      success: true,
      message: `Sale ${sale.invoiceNumber} has been voided and its stock returned.`,
      sale,
    };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}
