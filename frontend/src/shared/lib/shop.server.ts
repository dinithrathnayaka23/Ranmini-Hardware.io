import "server-only";

import { cache } from "react";

import { appConfig } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";

/**
 * The shop's own details, as every screen needs to render them.
 *
 * <p>Until now the currency symbol was a build-time constant in
 * `app.config.ts`, which meant Settings → Business Logic had a control that
 * changed a stored value nothing ever read. This is the read.
 *
 * <p>It comes from `/settings/public` rather than the full settings document
 * because the till needs it too, and a cashier is refused the administrator-only
 * settings endpoint. Everything in this payload ends up printed on a customer's
 * receipt anyway.
 */

export interface ShopSettings {
  companyName: string;
  primaryAddress: string;
  contactPhone: string;
  /** What prices are shown with, e.g. "Rs." */
  currencySymbol: string;
  /** A percentage, e.g. 15 for 15%. */
  taxRate: number;
  receiptPrefix: string;
  footerMessage: string;
  paperSize: string;
  showLogo: boolean;
}

/**
 * What a screen renders when the settings cannot be read.
 *
 * <p>A missing setting must never blank out a price or an invoice number: a
 * till that cannot reach the settings endpoint should still be able to take
 * money, with the shop's name missing from the top of the receipt rather than
 * the totals missing from the middle of it.
 */
const FALLBACK: ShopSettings = {
  companyName: appConfig.name,
  primaryAddress: "",
  contactPhone: "",
  currencySymbol: appConfig.currencySymbol,
  // Zero, deliberately. If the settings cannot be read, the till previews an
  // order without tax while the server would still charge it — so the fallback
  // is the value that is also the system's default, and the sale the server
  // returns after checkout is what the cashier is shown and prints.
  taxRate: 0,
  receiptPrefix: "INV",
  footerMessage: "",
  paperSize: "80MM",
  showLogo: true,
};

/**
 * Reads the shop's settings.
 *
 * <p>Cached two ways, for two different reasons. React's `cache` collapses the
 * several components on one page that all want the currency symbol into a single
 * request per render. The one-minute revalidation window then keeps a shop that
 * leaves the dashboard open on the counter from re-asking every few seconds for
 * a value that changes twice a year — while still being short enough that
 * changing the currency does not need a sign-out to take effect.
 */
export const getShopSettings = cache(async (): Promise<ShopSettings> => {
  try {
    return await apiFetch<ShopSettings>("/api/v1/settings/public", {
      revalidate: 60,
      tags: ["shop-settings"],
    });
  } catch {
    // Deliberately silent about the reason and deliberately not rethrown. This
    // is chrome, not content: a settings blip should not take down the screen
    // that was going to render perfectly well with the defaults.
    return FALLBACK;
  }
});

/** Just the symbol, for the server-side modules that only format money. */
export async function getCurrencySymbol(): Promise<string> {
  return (await getShopSettings()).currencySymbol;
}
