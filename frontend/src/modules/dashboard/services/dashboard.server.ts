import "server-only";

import {
  Boxes,
  CircleAlert,
  Receipt,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import type { StatCardModel } from "@/shared/components/ui/stat-card";
import { appConfig } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { formatCompactCurrency, formatCount, formatCurrency } from "@/shared/lib/format";

import type { LowStockItem } from "../types/dashboard.types";

/**
 * The dashboard's figures, from the backend's own bundled endpoint.
 *
 * <p>One request rather than four. The backend composes these from the modules
 * that already own them, so two screens cannot end up quoting different numbers
 * for the same thing — and a shop's connection does not pay for three extra
 * round trips to render one page.
 */

interface DashboardResponse {
  todayRevenue: number;
  todayTransactions: number;
  monthRevenue: number;
  monthProfit: number;
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryValue: number;
  lowStock: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
    unit: string | null;
  }[];
}

export interface DashboardView {
  stats: StatCardModel[];
  lowStock: LowStockItem[];
}

export async function fetchDashboard(): Promise<DashboardView> {
  const data = await apiFetch<DashboardResponse>("/api/v1/dashboard");
  const symbol = appConfig.currencySymbol;

  return {
    stats: [
      {
        id: "today-revenue",
        label: "Today's Revenue",
        value: formatCurrency(data.todayRevenue, symbol),
        icon: Receipt,
        accent: "brand",
        caption: {
          label:
            data.todayTransactions === 1
              ? "1 sale so far today"
              : `${formatCount(data.todayTransactions)} sales so far today`,
          accent: "neutral",
        },
      },
      {
        id: "month-revenue",
        label: "Revenue This Month",
        value: formatCompactCurrency(data.monthRevenue, symbol),
        icon: TrendingUp,
        accent: "success",
        caption: {
          label: `${formatCompactCurrency(data.monthProfit, symbol)} profit`,
          accent: "success",
        },
      },
      {
        id: "inventory-value",
        label: "Inventory Value",
        value: formatCompactCurrency(data.inventoryValue, symbol),
        icon: WalletCards,
        accent: "brand",
        caption: {
          label: `${formatCount(data.totalProducts)} products`,
          accent: "neutral",
        },
      },
      {
        id: "needs-attention",
        label: "Needs Attention",
        value: formatCount(data.lowStockItems + data.outOfStockItems),
        icon: data.outOfStockItems > 0 ? CircleAlert : TriangleAlert,
        accent: data.outOfStockItems > 0 ? "danger" : "warning",
        valueAccent: data.outOfStockItems > 0 ? "danger" : undefined,
        caption: {
          label: `${formatCount(data.outOfStockItems)} out of stock`,
          accent: data.outOfStockItems > 0 ? "danger" : "neutral",
        },
      },
    ],

    lowStock: data.lowStock.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      unit: item.unit ?? "pcs",
      // The panel's icon is presentation, not data: the backend has no opinion
      // on what a bag of cement looks like, so it is chosen here.
      icon: Boxes,
    })),
  };
}
