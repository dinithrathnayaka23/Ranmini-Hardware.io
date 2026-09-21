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
  /** Manufacturer, or null when none was recorded. */
  brand: string | null;
  /** The category's id, for the edit form's select. */
  categoryId: string;
  /** The category's name, denormalised by the backend for display. */
  category: string;
  /** Unit of issue — bags, pcs, kg. */
  unit: string;
  /** Cost price, in the store's base currency. */
  buyingPrice: number;
  /** Retail price, in the store's base currency. */
  sellingPrice: number;
  stock: number;
  /** The level at or below which this line counts as low. */
  reorderLevel: number;
  status: StockStatus;
  // No photograph fields. The management screens do not show product pictures —
  // this is a stock ledger, and a hardware shop's owner identifies a line by its
  // SKU. The till still shows them: see `modules/pos/types/pos.types.ts`.
  /**
   * Whether the product is on sale.
   *
   * <p>Products are withdrawn, never deleted — old receipts reference them — so
   * the table has to be able to show a withdrawn line and offer to restore it.
   */
  active: boolean;
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
