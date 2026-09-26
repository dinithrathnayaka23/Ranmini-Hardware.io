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
   * Last-resort symbol shown against monetary figures.
   *
   * The shop's real symbol is a saved setting (Settings → Business Logic) and
   * is read through `shop.server.ts`; screens get it from `useCurrency()` or
   * `getCurrencySymbol()`. This constant is only what renders when that read
   * fails — a till that cannot reach the settings endpoint should still be able
   * to take money, with a default symbol rather than no prices at all.
   *
   * Settled as the rupee, matching `businessLogicDefaults.currencySymbol` and
   * the backend's own default, against the inventory design's lone "$".
   */
  currencySymbol: "Rs.",
} as const;

/** Canonical route table — avoids magic strings scattered across components. */
export const routes = {
  // Unauthenticated
  adminLogin: "/admin/login",
  cashierLogin: "/cashier/login",
  forgotPassword: "/admin/forgot-password",
  /**
   * Where the link in a reset email lands.
   *
   * Kept in step with the backend's `ranmini.app.reset-url`, which is what
   * actually builds the address that gets emailed. Changing one without the
   * other sends staff to a 404.
   */
  resetPassword: "/admin/reset-password",
  /**
   * Where a signed-in administrator is sent to replace a temporary password.
   * The backend will let such a session do nothing else, so nor does the portal.
   */
  adminSetPassword: "/admin/set-password",

  // Till account recovery. Two ways in, because most cashiers have no email
  // address: a link for those who do, and a request to the owner for those who
  // do not — see the cashier forgot-password page.
  cashierForgotPassword: "/cashier/forgot-password",
  /** Kept in step with the backend's `ranmini.app.cashier-reset-url`. */
  cashierResetPassword: "/cashier/reset-password",
  cashierSetPassword: "/cashier/set-password",

  // Management portal
  adminDashboard: "/admin/dashboard",
  adminInventory: "/admin/inventory",
  adminInventoryNew: "/admin/inventory/new",
  /**
   * A product's edit screen.
   *
   * A function rather than a template written at each call site, so the one
   * place that knows this path is still this table — the whole point of it.
   */
  adminInventoryEdit: (id: string) => `/admin/inventory/${encodeURIComponent(id)}/edit`,
  adminInventoryCategories: "/admin/inventory/categories",
  /** Adding and updating products in bulk from a spreadsheet. */
  adminInventoryImport: "/admin/inventory/import",
  adminReports: "/admin/reports",
  adminReportsDaily: "/admin/reports/daily",
  adminStaff: "/admin/staff",
  adminProfile: "/admin/profile",
  adminSettings: "/admin/settings",
  adminSettingsBusinessLogic: "/admin/settings/business-logic",
  adminSettingsReceipts: "/admin/settings/receipts",
  adminSettingsSecurity: "/admin/settings/security",

  // Cashier till
  cashierPos: "/cashier/pos",
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
  /**
   * Signing out is scoped by portal for the same reason signing in is: the two
   * sessions are separate cookies, and ending one must not end the other. An
   * owner closing the portal on the counter machine should leave the till
   * signed in and mid-sale.
   */
  logoutFor: (portal: string) => `/api/auth/${portal}/logout`,
} as const;
