import {
  ClipboardCheck,
  CircleAlert,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import type { StatCardModel } from "@/shared/components/ui/stat-card";

import type { InventoryPageMeta, Product } from "../types/inventory.types";

/**
 * PLACEHOLDER DATA — replace with live figures from the Spring Boot API.
 *
 * Expected endpoints, once they exist:
 *   GET /api/v1/inventory/summary                        -> inventoryStats
 *   GET /api/v1/inventory/products?page=&size=&q=        -> products + pageMeta
 *
 * The table already takes its rows and paging state as props, so wiring live
 * data is a change to the page's data source, not to any component.
 */

export const inventoryStats: StatCardModel[] = [
  {
    id: "total-products",
    label: "Total Products",
    value: "12,450",
    icon: ClipboardCheck,
    accent: "brand",
    caption: { label: "+24 this week", accent: "success", icon: TrendingUp },
  },
  {
    id: "low-stock",
    label: "Low Stock Items",
    value: "142",
    icon: TriangleAlert,
    accent: "warning",
    caption: { label: "Require attention soon", accent: "warning" },
  },
  {
    id: "out-of-stock",
    label: "Out of Stock",
    value: "28",
    icon: CircleAlert,
    accent: "danger",
    // The figure itself is the problem, so it carries the colour rather than
    // relying on the caption to explain that a rise here is bad news.
    valueAccent: "danger",
    caption: { label: "+5 since yesterday", accent: "danger", icon: TrendingUp },
  },
  {
    id: "inventory-value",
    label: "Inventory Value",
    value: "$1.2M",
    icon: WalletCards,
    accent: "success",
    caption: { label: "Est. Retail Value", accent: "neutral" },
  },
];

export const products: Product[] = [
  {
    id: "HW-8472",
    sku: "HW-8472",
    name: "DeWalt 20V Max Cordless Drill",
    category: "Power Tools",
    buyingPrice: 85.0,
    sellingPrice: 129.99,
    stock: 45,
    status: "IN_STOCK",
  },
  {
    id: "PL-1033",
    sku: "PL-1033",
    name: 'PVC Pipe Schedule 40 2" x 10ft',
    category: "Plumbing",
    buyingPrice: 8.5,
    sellingPrice: 14.25,
    stock: 12,
    status: "LOW_STOCK",
  },
  {
    id: "EL-5591",
    sku: "EL-5591",
    name: "Romex Wire 12/2 250ft Roll",
    category: "Electrical",
    buyingPrice: 95.0,
    sellingPrice: 145.0,
    stock: 0,
    status: "OUT_OF_STOCK",
  },
  {
    id: "FA-2204",
    sku: "FA-2204",
    name: 'Galvanized Hex Bolts 3/8" x 2" (Box 100)',
    category: "Fasteners",
    buyingPrice: 12.0,
    sellingPrice: 24.5,
    stock: 85,
    status: "IN_STOCK",
  },
  {
    id: "PT-9011",
    sku: "PT-9011",
    name: "Premium Exterior Paint 1 Gallon - White",
    category: "Paint & Sundries",
    buyingPrice: 22.5,
    sellingPrice: 38.99,
    stock: 34,
    status: "IN_STOCK",
  },
];

export const pageMeta: InventoryPageMeta = {
  page: 1,
  pageSize: 5,
  totalEntries: 12450,
  totalPages: 2490,
};
