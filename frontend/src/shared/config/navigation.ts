import {
  ChartColumn,
  Boxes,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { routes } from "./app.config";

/**
 * Primary navigation for the management portal.
 *
 * Declared as data rather than markup so the sidebar and the mobile drawer
 * render the exact same set from one definition — adding a section is a single
 * entry here, not a change in two places that can drift apart.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const portalNavItems: NavItem[] = [
  { label: "Dashboard", href: routes.adminDashboard, icon: LayoutDashboard },
  { label: "Inventory", href: routes.adminInventory, icon: Boxes },
  { label: "Reports", href: routes.adminReports, icon: ChartColumn },
  { label: "Staff", href: routes.adminStaff, icon: Users },
  { label: "Settings", href: routes.adminSettings, icon: Settings },
];

/**
 * Marks a nav row as current.
 *
 * Uses a prefix match so a nested route such as `/admin/inventory/PVC-200-4`
 * keeps its parent section highlighted, while still treating the dashboard as
 * an exact match — otherwise `/admin/` would light up every row.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === routes.adminDashboard) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
