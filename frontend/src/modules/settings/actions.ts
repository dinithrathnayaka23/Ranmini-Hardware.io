"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch, apiFetchMultipart } from "@/shared/lib/api.server";
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

/**
 * Drops every cached copy of the settings document.
 *
 * <p>Two tags, because two different reads cache it. "settings" is the admin
 * form's own copy; "shop-settings" is the public subset every screen reads for
 * the currency symbol and the receipt footer, on a one-minute window. Without
 * the second one, changing the currency would leave the till and the reports
 * printing the old symbol until that window happened to expire.
 *
 * <p>The paths sweep further than this form's own page because the chrome on
 * every portal screen and the till both render from the public settings.
 */
async function refreshSettings(): Promise<void> {
  revalidateTag("settings");
  revalidateTag("shop-settings");
  revalidatePath(routes.adminSettings);
  revalidatePath(routes.adminDashboard);
  revalidatePath(routes.adminInventory);
  revalidatePath(routes.adminReports);
  revalidatePath(routes.cashierPos);
}

async function save(
  section: string,
  body: unknown,
  successMessage: string,
): Promise<SettingsActionResult> {
  try {
    await apiFetch(`/api/v1/settings/${section}`, { method: "PATCH", body });

    await refreshSettings();

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

/**
 * Uploads the shop's logo.
 *
 * <p>Takes {@link FormData} rather than bytes: the file is forwarded without
 * ever being read into this action's memory or re-encoded. The API checks the
 * declared type against an allowlist and the bytes against the magic number
 * that type implies, which is the check that actually decides — the picker's
 * own checks are a courtesy to whoever chose the wrong file.
 */
export async function uploadShopLogo(data: FormData): Promise<SettingsActionResult> {
  try {
    await apiFetchMultipart("/api/v1/settings/logo", data);
    await refreshSettings();
    return { success: true, message: "Logo saved. It will appear on new receipts." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

export async function removeShopLogo(): Promise<SettingsActionResult> {
  try {
    await apiFetch("/api/v1/settings/logo", { method: "DELETE" });
    await refreshSettings();
    return { success: true, message: "Logo removed." };
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message };
    return { success: false, message: errorMessages.unexpected };
  }
}

function invalid(): SettingsActionResult {
  return { success: false, message: "Those settings are not valid." };
}
