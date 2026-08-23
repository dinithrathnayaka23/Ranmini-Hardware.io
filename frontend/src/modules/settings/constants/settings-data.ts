import type {
  BusinessLogicValues,
  ReceiptsValues,
  SecurityValues,
  ShopProfileValues,
} from "../schemas/settings.schema";

/**
 * PLACEHOLDER DATA — replace with the stored configuration from the API.
 *
 * Expected endpoints, once they exist:
 *   GET   /api/v1/settings           -> all four sections
 *   PATCH /api/v1/settings/{section} -> saves one section
 *
 * Each form takes its defaults as props, so wiring live values is a change to
 * the page's data source rather than to any component.
 */

export const shopProfileDefaults: ShopProfileValues = {
  companyName: "Ranmini Hardware",
  registrationNumber: "PV-1029348",
  primaryAddress: "124 Main Street, Business District, Colombo 03",
  contactEmail: "admin@ranminihardware.com",
  contactPhone: "+94 11 234 5678",
};

export const businessLogicDefaults: BusinessLogicValues = {
  taxRate: 15,
  lowStockThreshold: 20,
  currencySymbol: "Rs.",
  stockValuation: "WEIGHTED_AVERAGE",
};

export const receiptsDefaults: ReceiptsValues = {
  receiptPrefix: "INV",
  footerMessage: "Thank you for shopping with Ranmini Hardware.",
  paperSize: "80MM",
  showLogo: true,
};

export const securityDefaults: SecurityValues = {
  sessionTimeoutMinutes: "30",
  minPasswordLength: 8,
  lockoutThreshold: 8,
  auditLogEnabled: true,
};
