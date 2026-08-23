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
} as const;

/** Canonical route table — avoids magic strings scattered across components. */
export const routes = {
  adminLogin: "/admin/login",
  adminDashboard: "/admin/dashboard",
  forgotPassword: "/admin/forgot-password",
  support: "/support",
  privacy: "/privacy",
} as const;

/** Internal BFF endpoints exposed by this Next.js app to its own browser client. */
export const apiRoutes = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
} as const;
