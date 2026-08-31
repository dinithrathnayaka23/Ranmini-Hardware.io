import "server-only";

import { apiFetch, type PageResponse } from "@/shared/lib/api.server";
import { appConfig } from "@/shared/config/app.config";
import { formatCompactCurrency, formatCount } from "@/shared/lib/format";
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
 */
export async function fetchInventoryPage(
  page: number,
  query?: string,
): Promise<InventoryPage> {
  const params = new URLSearchParams({ page: String(page), size: "10" });
  if (query) params.set("q", query);

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
 * The four cards above the table.
 *
 * <p>Captions describe what the figure means rather than inventing a trend.
 * The placeholder version claimed things like "+24 this week", which the API
 * does not measure — a dashboard that states a number nobody computed is worse
 * than one that says less.
 */
export async function fetchInventoryStats(): Promise<StatCardModel[]> {
  const summary = await apiFetch<SummaryResponse>("/api/v1/inventory/summary");
  const { ClipboardCheck, CircleAlert, TriangleAlert, WalletCards } = await import(
    "lucide-react"
  );

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
      value: formatCompactCurrency(summary.retailValue, appConfig.currencySymbol),
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
    category: response.category,
    buyingPrice: response.buyingPrice,
    sellingPrice: response.sellingPrice,
    stock: response.stock,
    status: response.status,
  };
}
