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
   * Fallback symbol shown against monetary figures.
   *
   * The shop's real symbol is a saved setting (Settings → Business Logic), and
   * this is the build-time default the portal renders until that setting is
   * loaded from the backend. It matches `businessLogicDefaults.currencySymbol`
   * and must be kept in step with it.
   *
   * Settled as the rupee: the dashboard, the till and the business-logic
   * default all use it, against the inventory design's lone "$".
   */
  currencySymbol: "Rs.",
} as const;

/** Canonical route table — avoids magic strings scattered across components. */
export const routes = {
  // Unauthenticated
  adminLogin: "/admin/login",
  cashierLogin: "/cashier/login",
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
  adminProfile: "/admin/profile",
  adminSettings: "/admin/settings",
  adminSettingsBusinessLogic: "/admin/settings/business-logic",
  adminSettingsReceipts: "/admin/settings/receipts",
  adminSettingsSecurity: "/admin/settings/security",

  // Cashier till
  cashierPos: "/cashier/pos",

  // Public
  support: "/support",
  privacy: "/privacy",
} as const;

/** Internal BFF endpoints exposed by this Next.js app to its own browser client. */
export const apiRoutes = {
  /**
   * Sign-in is scoped by portal in the URL rather than by a field in the body,
   * so the handler knows which portal it is serving before it reads (and
   * therefore before it has to buffer) the request body.
   *
   * Typed as `string` to keep this module free of a dependency on the auth
   * module — the caller supplies an already-validated `PortalId`.
   */
  loginFor: (portal: string) => `/api/auth/${portal}/login`,
  logout: "/api/auth/logout",
} as const;
