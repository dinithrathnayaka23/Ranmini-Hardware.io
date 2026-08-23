import type { LucideIcon } from "lucide-react";

/**
 * Shapes rendered by the dashboard.
 *
 * These describe the *view* model, not the backend contract. When the Spring
 * Boot reporting endpoints land, map their responses onto these types in a
 * service module so the components stay unchanged.
 */

export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  /** Unit of issue, e.g. "bags", "pcs", "pkts". */
  unit: string;
  icon: LucideIcon;
}

export interface ActivityEntry {
  id: string;
  title: string;
  description: string;
  /** Human-readable age, e.g. "10 min ago". */
  timeAgo: string;
  icon: LucideIcon;
  /** `brand` highlights revenue events; `neutral` covers routine movements. */
  tone: "brand" | "neutral";
}
