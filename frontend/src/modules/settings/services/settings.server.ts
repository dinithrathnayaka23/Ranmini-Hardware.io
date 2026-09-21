import "server-only";

import { adminFetch } from "@/modules/auth/services/guarded-fetch.server";

import type {
  BusinessLogicValues,
  ReceiptsValues,
  SecurityValues,
  ShopProfileValues,
} from "../schemas/settings.schema";

/**
 * The shop's stored configuration.
 *
 * <p>Fetched as one document and split into the four sections the screens
 * expect. The backend keeps them together because they are always read together
 * and written a section at a time — so one request here, not four.
 */

interface SettingsResponse {
  profile: ShopProfileValues;
  /** ISO timestamp, or null when the shop has no logo. */
  logoUpdatedAt: string | null;
  businessLogic: {
    taxRate: number;
    lowStockThreshold: number;
    currencySymbol: string;
    stockValuation: string;
  };
  receipts: ReceiptsValues;
  security: {
    sessionTimeoutMinutes: number;
    minPasswordLength: number;
    lockoutThreshold: number;
    auditLogEnabled: boolean;
  };
}

export interface SettingsView {
  profile: ShopProfileValues;
  /**
   * When the shop's logo last changed, or null when there is none.
   *
   * <p>Outside `profile` because that object is exactly the shape the profile
   * form submits back. A stamp inside it would be posted to the API as though
   * it were an editable field.
   */
  logoUpdatedAt: string | null;
  businessLogic: BusinessLogicValues;
  receipts: ReceiptsValues;
  security: SecurityValues;
}

export async function fetchSettings(): Promise<SettingsView> {
  const settings = await adminFetch<SettingsResponse>("/api/v1/settings", {
    // Read on nearly every settings page load and changed perhaps twice a year.
    revalidate: 60,
    tags: ["settings"],
  });

  return {
    profile: settings.profile,
    logoUpdatedAt: settings.logoUpdatedAt ?? null,
    businessLogic: {
      taxRate: settings.businessLogic.taxRate,
      lowStockThreshold: settings.businessLogic.lowStockThreshold,
      // The form's select offers a closed set; anything else the backend holds
      // falls back to the rupee rather than rendering a select with no match,
      // which would silently look like the first option was chosen.
      currencySymbol:
        settings.businessLogic.currencySymbol === "$" ? "$" : "Rs.",
      // Always weighted average, whatever is stored. A document written while
      // the form still offered FIFO would otherwise seed a value the schema no
      // longer accepts, and the section would refuse to save until somebody
      // worked out why.
      stockValuation: "WEIGHTED_AVERAGE",
    },
    receipts: settings.receipts,
    security: {
      // The form models the timeout as a string because it is a select value.
      sessionTimeoutMinutes: normaliseTimeout(settings.security.sessionTimeoutMinutes),
      minPasswordLength: settings.security.minPasswordLength,
      lockoutThreshold: settings.security.lockoutThreshold,
      auditLogEnabled: settings.security.auditLogEnabled,
    },
  };
}

/** The select offers four windows; anything else snaps to the nearest option. */
function normaliseTimeout(minutes: number): SecurityValues["sessionTimeoutMinutes"] {
  const options = [15, 30, 60, 240] as const;
  const closest = options.reduce((best, option) =>
    Math.abs(option - minutes) < Math.abs(best - minutes) ? option : best,
  );
  return String(closest) as SecurityValues["sessionTimeoutMinutes"];
}
