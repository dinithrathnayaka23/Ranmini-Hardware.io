/**
 * Static, non-secret application metadata.
 *
 * Safe to import from both server and client code — nothing here is
 * configuration that changes between environments, and nothing is a secret.
 */
export const appConfig = {
  name: "Ranmini Hardware",
  shortName: "Ranmini",
  description:
    "Enterprise-grade hardware inventory and operations management system.",
  legalEntity: "Ranmini Hardware",
  copyrightStartYear: 2024,

  /**
   * Symbol shown against monetary figures.
   *
   * NOTE FOR REVIEW: the supplied designs disagree — the inventory screen uses
   * "$" while the dashboard uses "Rs.". This follows the inventory design; the
   * dashboard figures are still literal strings in its placeholder data.
   * Confirm the intended currency before either screen goes live, then drive
   * both from here.
   */
  currencySymbol: "$",
} as const;

/** Canonical route table — avoids magic strings scattered across components. */
export const routes = {
  // Unauthenticated
  adminLogin: "/admin/login",
  forgotPassword: "/admin/forgot-password",

  // Management portal
  adminDashboard: "/admin/dashboard",
  adminInventory: "/admin/inventory",
  adminInventoryNew: "/admin/inventory/new",
  adminInventoryCategories: "/admin/inventory/categories",
  adminReports: "/admin/reports",
  adminReportsGenerate: "/admin/reports/generate",
  adminReportsDaily: "/admin/reports/daily",
  adminStaff: "/admin/staff",
  adminSettings: "/admin/settings",
  adminSettingsBusinessLogic: "/admin/settings/business-logic",
  adminSettingsReceipts: "/admin/settings/receipts",
  adminSettingsSecurity: "/admin/settings/security",

  // Public
  support: "/support",
  privacy: "/privacy",
} as const;

/** Internal BFF endpoints exposed by this Next.js app to its own browser client. */
export const apiRoutes = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
} as const;
