import "server-only";

import {
  CircleAlert,
  ClipboardCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import { apiFetch, type PageResponse } from "@/shared/lib/api.server";
import { formatCompactCurrency, formatCount } from "@/shared/lib/format";
import { getCurrencySymbol } from "@/shared/lib/shop.server";
import type { StatCardModel } from "@/shared/components/ui/stat-card";

import type { InventoryPageMeta, Product } from "../types/inventory.types";

/**
 * Inventory reads for the admin table.
 *
 * <p>The mapping from the API's shape to the table's view model lives here
 * rather than in a component, so a change on either side is a change to this
 * one file.
 */

interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  categoryId: string;
  category: string;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
  status: Product["status"];
  imageUrl: string | null;
  imageVersion: string | null;
  active: boolean;
}

interface SummaryResponse {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  retailValue: number;
  costValue: number;
}

export interface InventoryPage {
  products: Product[];
  meta: InventoryPageMeta;
}

/**
 * One page of the catalogue.
 *
 * @param page 1-based, matching the URL a shopkeeper may bookmark
 * @param query free text matched against name, SKU and brand by the backend's
 *   text index — deliberately not filtered here, since sending the whole
 *   catalogue to the server to filter it in Node would defeat the index
 * @param status restrict to one stock state, also server-side. Filtering the
 *   loaded page instead would mean "Out of Stock" showed only the out-of-stock
 *   products that happened to be on page one.
 */
export async function fetchInventoryPage(
  page: number,
  query?: string,
  status?: string,
): Promise<InventoryPage> {
  const params = new URLSearchParams({
    page: String(page),
    size: "10",
    // Withdrawn products are listed too. They are excluded from the till by the
    // backend, but hiding them here would leave somebody who withdrew a line by
    // mistake with no way to find it and bring it back.
    activeOnly: "false",
  });
  if (query) params.set("q", query);
  if (status) params.set("status", status);

  const response = await apiFetch<PageResponse<ProductResponse>>(
    `/api/v1/inventory/products?${params}`,
  );

  return {
    products: response.content.map(toProduct),
    meta: {
      page: response.page,
      pageSize: response.pageSize,
      totalEntries: response.totalEntries,
      totalPages: response.totalPages,
    },
  };
}

/**
 * One product, for the edit screen.
 *
 * <p>Read fresh on every request rather than from the listing's cache: an edit
 * form opened on stale figures would save them back, quietly undoing whatever
 * changed in between.
 */
export async function fetchProduct(id: string): Promise<Product> {
  const response = await apiFetch<ProductResponse>(
    `/api/v1/inventory/products/${encodeURIComponent(id)}`,
  );
  return toProduct(response);
}

/**
 * The four cards above the table.
 *
 * <p>Captions describe what the figure means rather than inventing a trend.
 * The placeholder version claimed things like "+24 this week", which the API
 * does not measure — a dashboard that states a number nobody computed is worse
 * than one that says less.
 */
export async function fetchInventoryStats(): Promise<StatCardModel[]> {
  // Settings → Business Logic owns the currency; this used to print the
  // build-time default whatever the shop had chosen.
  const currency = await getCurrencySymbol();
  const summary = await apiFetch<SummaryResponse>("/api/v1/inventory/summary", {
    // The endpoint sends `Cache-Control: private, max-age=30` because these are
    // aggregates over the whole catalogue and are expensive relative to how
    // fast they change. Reading them with `no-store` threw that away and re-ran
    // the pipeline on every page view; this honours the window the API itself
    // declares, and the tag lets a product write clear it immediately.
    revalidate: 30,
    tags: ["inventory-summary"],
  });

  return [
    {
      id: "total-products",
      label: "Total Products",
      value: formatCount(summary.totalProducts),
      icon: ClipboardCheck,
      accent: "brand",
      caption: { label: "Active in the catalogue", accent: "neutral" },
    },
    {
      id: "low-stock",
      label: "Low Stock Items",
      value: formatCount(summary.lowStockItems),
      icon: TriangleAlert,
      accent: "warning",
      caption: { label: "At or below reorder level", accent: "warning" },
    },
    {
      id: "out-of-stock",
      label: "Out of Stock",
      value: formatCount(summary.outOfStockItems),
      icon: CircleAlert,
      accent: "danger",
      // The figure itself is the problem, so it carries the colour rather than
      // relying on the caption to explain that a rise here is bad news.
      valueAccent: summary.outOfStockItems > 0 ? "danger" : undefined,
      caption: { label: "Cannot be sold", accent: "danger" },
    },
    {
      id: "inventory-value",
      label: "Inventory Value",
      value: formatCompactCurrency(summary.retailValue, currency),
      icon: WalletCards,
      accent: "success",
      caption: { label: "Stock on hand at retail", accent: "neutral" },
    },
  ];
}

function toProduct(response: ProductResponse): Product {
  return {
    id: response.id,
    sku: response.sku,
    name: response.name,
    brand: response.brand,
    categoryId: response.categoryId,
    category: response.category,
    unit: response.unit,
    buyingPrice: response.buyingPrice,
    sellingPrice: response.sellingPrice,
    stock: response.stock,
    reorderLevel: response.reorderLevel,
    status: response.status,
    imageUrl: response.imageUrl,
    imageVersion: response.imageVersion,
    active: response.active,
  };
}
