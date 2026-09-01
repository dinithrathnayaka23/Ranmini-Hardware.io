import { settingsSections } from "@/modules/settings/constants/settings-sections";

import { routes } from "./app.config";
import { portalNavItems } from "./navigation";

/** One step in the trail. The last one is the page you are on. */
export interface Crumb {
  label: string;
  href: string;
}

/**
 * Labels for every portal path, assembled from the navigation that already
 * exists rather than written out a second time.
 *
 * <p>That matters more than it looks. A separate list of breadcrumb labels
 * drifts the first time somebody renames a nav row — you end up with a sidebar
 * saying "Stock" and a breadcrumb still saying "Inventory", and nobody notices
 * because the two are never on screen together in a diff. Deriving them means a
 * rename happens in one place.
 *
 * <p>Only the leaves that appear in no navigation at all are named here.
 */
const LABELS: ReadonlyMap<string, string> = (() => {
  const labels = new Map<string, string>();

  // Top-level sections, straight from the sidebar.
  for (const item of portalNavItems) {
    labels.set(item.href, item.label);
  }

  // The dashboard is the root of the trail, so it reads as "Home" rather than
  // repeating the sidebar's "Dashboard" — a crumb answers "where am I in the
  // hierarchy", and the top of a hierarchy is home.
  labels.set(routes.adminDashboard, "Home");

  // Settings sub-sections, from the settings rail. Its first entry points at
  // /admin/settings itself, which is already labelled "Settings" above as the
  // parent — overwriting it with "Shop Profile" would make the crumb disagree
  // with the sidebar row that leads to it.
  for (const section of settingsSections) {
    if (section.href !== routes.adminSettings) labels.set(section.href, section.label);
  }

  // Reached from the account menu rather than the sidebar, so it has no nav
  // entry to take a label from.
  labels.set(routes.adminProfile, "My Profile");

  // Leaves that live in no navigation: reached from a button on their parent.
  labels.set(routes.adminInventoryNew, "Add Product");
  labels.set(routes.adminInventoryCategories, "Categories");
  labels.set(routes.adminReportsGenerate, "Generate Report");
  labels.set(routes.adminReportsDaily, "Daily Summary");

  return labels;
})();

/**
 * Turns a pathname into the trail that leads to it.
 *
 * <p>Walks the path a segment at a time and keeps every step that has a label,
 * so `/admin/settings/receipts` becomes Home → Settings → Receipts. A segment
 * with no label — a record id in a future `/admin/inventory/{sku}`, say — falls
 * back to a readable form of the segment itself rather than being dropped,
 * because a trail with a hole in it is worse than one with an ugly step.
 *
 * @returns at least one crumb; on the dashboard that is Home alone.
 */
export function buildBreadcrumbs(pathname: string): Crumb[] {
  const home: Crumb = { label: "Home", href: routes.adminDashboard };

  // Strip the query and any trailing slash before splitting.
  const clean = pathname.split("?")[0].replace(/\/+$/, "");
  const segments = clean.split("/").filter(Boolean);

  // Anything outside the portal has no trail to build.
  if (segments[0] !== "admin") return [home];

  const crumbs: Crumb[] = [home];
  let href = "/admin";

  for (const segment of segments.slice(1)) {
    href += `/${segment}`;

    // The dashboard is already the root; listing it again would read
    // "Home → Home".
    if (href === routes.adminDashboard) continue;

    crumbs.push({ label: LABELS.get(href) ?? toReadable(segment), href });
  }

  return crumbs;
}

/** "business-logic" becomes "Business Logic". */
function toReadable(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
