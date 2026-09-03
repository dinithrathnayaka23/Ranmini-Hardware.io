"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import {
  businessLogicSchema,
  receiptsSchema,
  securitySchema,
  shopProfileSchema,
} from "./schemas/settings.schema";

/**
 * Saving the shop's configuration.
 *
 * <p>One action per section, matching the four screens and the backend's
 * per-section PATCH. Saving the whole document at once would mean the receipt
 * footer could silently revert a tax rate somebody changed on another tab a
 * minute earlier.
 *
 * <p>Each action re-validates with the same schema the form used. A Server
 * Action is reachable over HTTP like any endpoint, so the browser's copy is a
 * convenience and this is the check that counts.
 */

export type SettingsActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

async function save(
  section: string,
  body: unknown,
  successMessage: string,
): Promise<SettingsActionResult> {
  try {
    await apiFetch(`/api/v1/settings/${section}`, { method: "PATCH", body });

    // Two tags, because two different reads cache this document. "settings" is
    // the admin form's own copy; "shop-settings" is the public subset every
    // screen reads for the currency symbol and the receipt footer, on a
    // one-minute window. Without the second one, changing the currency would
    // leave the till and the reports printing the old symbol until that window
    // happened to expire.
    revalidateTag("settings");
    revalidateTag("shop-settings");
    revalidatePath(routes.adminSettings);
    // The chrome on every portal screen and the till both render from the
    // public settings, so a change has to sweep further than this form's page.
    revalidatePath(routes.adminDashboard);
    revalidatePath(routes.adminInventory);
    revalidatePath(routes.adminReports);
    revalidatePath(routes.cashierPos);

    return { success: true, message: successMessage };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

export async function saveShopProfile(values: unknown): Promise<SettingsActionResult> {
  const parsed = shopProfileSchema.safeParse(values);
  if (!parsed.success) return invalid();
  return save("profile", parsed.data, "Shop profile saved.");
}

export async function saveBusinessLogic(values: unknown): Promise<SettingsActionResult> {
  const parsed = businessLogicSchema.safeParse(values);
  if (!parsed.success) return invalid();
  return save("business-logic", parsed.data, "Business rules saved.");
}

export async function saveReceipts(values: unknown): Promise<SettingsActionResult> {
  const parsed = receiptsSchema.safeParse(values);
  if (!parsed.success) return invalid();
  return save("receipts", parsed.data, "Receipt settings saved.");
}

export async function saveSecurity(values: unknown): Promise<SettingsActionResult> {
  const parsed = securitySchema.safeParse(values);
  if (!parsed.success) return invalid();

  // The form models the timeout as a select value; the API stores a number.
  return save(
    "security",
    { ...parsed.data, sessionTimeoutMinutes: Number(parsed.data.sessionTimeoutMinutes) },
    "Security settings saved.",
  );
}

function invalid(): SettingsActionResult {
  return { success: false, message: "Those settings are not valid." };
}
