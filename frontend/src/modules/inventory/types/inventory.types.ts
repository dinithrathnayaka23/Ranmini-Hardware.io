import type { Accent } from "@/shared/lib/accent";

/**
 * Inventory view model.
 *
 * Describes what the table renders, not the backend's persistence shape. When
 * the Spring Boot inventory endpoints land, map their responses onto these
 * types in a service module so the components stay untouched.
 */

/**
 * Stock state of a product line.
 *
 * Stored rather than derived here on purpose: whether a line counts as "low"
 * depends on its own reorder level, which the backend holds. Recomputing it in
 * the browser would mean shipping every product's threshold to the client and
 * risking the two disagreeing.
 */
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  /** Cost price, in the store's base currency. */
  buyingPrice: number;
  /** Retail price, in the store's base currency. */
  sellingPrice: number;
  stock: number;
  status: StockStatus;
}

/** Server-side paging state; the table renders it but does not own it. */
export interface InventoryPageMeta {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}

/** How each status is labelled and coloured wherever it appears. */
export const stockStatusPresentation: Record<
  StockStatus,
  { label: string; accent: Accent }
> = {
  IN_STOCK: { label: "In Stock", accent: "success" },
  LOW_STOCK: { label: "Low Stock", accent: "warning" },
  OUT_OF_STOCK: { label: "Out of Stock", accent: "danger" },
};
