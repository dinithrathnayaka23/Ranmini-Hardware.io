import {
  Banknote,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { StatCardModel } from "@/shared/components/ui/stat-card";

import type {
  CategoryShare,
  DailySummaryRow,
  ReportPeriod,
  SalesPoint,
  TopProduct,
} from "../types/reports.types";

/**
 * PLACEHOLDER DATA — replace with live figures from the Spring Boot API.
 *
 * Expected endpoints, once they exist:
 *   GET /api/v1/reports/summary?period=      -> reportStats
 *   GET /api/v1/reports/sales-trend?period=  -> salesTrend
 *   GET /api/v1/reports/categories?period=   -> categoryShares
 *   GET /api/v1/reports/top-products?period= -> topProducts
 *   GET /api/v1/reports/daily?period=        -> dailySummary
 *
 * Every widget already takes its rows as props, so wiring live data is a change
 * to the page's data source rather than to any component.
 */

export const reportPeriods: ReportPeriod[] = [
  { value: "2023-10", label: "This Month (October 2023)" },
  { value: "2023-09", label: "Last Month (September 2023)" },
  { value: "2023-Q3", label: "Quarter to Date (Q3 2023)" },
  { value: "2023", label: "Year to Date (2023)" },
];

export const defaultPeriod = reportPeriods[0]!;

export const reportStats: StatCardModel[] = [
  {
    id: "total-revenue",
    label: "Total Revenue",
    value: "$124,500",
    icon: Banknote,
    accent: "brand",
    caption: {
      label: "+12.5% vs last month",
      accent: "success",
      icon: TrendingUp,
    },
  },
  {
    id: "gross-profit",
    label: "Gross Profit",
    value: "$42,300",
    icon: CreditCard,
    accent: "warning",
    caption: {
      label: "+8.2% vs last month",
      accent: "success",
      icon: TrendingUp,
    },
  },
  {
    id: "total-transactions",
    label: "Total Transactions",
    value: "3,452",
    icon: ReceiptText,
    accent: "neutral",
    caption: {
      label: "-2.1% vs last month",
      accent: "danger",
      icon: TrendingDown,
    },
  },
  {
    id: "avg-order-value",
    label: "Avg. Order Value",
    value: "$36.06",
    icon: ShoppingCart,
    accent: "brand",
    caption: {
      label: "+5.4% vs last month",
      accent: "success",
      icon: TrendingUp,
    },
  },
];

export const salesTrend: SalesPoint[] = [
  { date: "2023-10-02", label: "Oct 2", revenue: 3210 },
  { date: "2023-10-04", label: "Oct 4", revenue: 3480 },
  { date: "2023-10-06", label: "Oct 6", revenue: 3120 },
  { date: "2023-10-08", label: "Oct 8", revenue: 3960 },
  { date: "2023-10-10", label: "Oct 10", revenue: 4610 },
  { date: "2023-10-12", label: "Oct 12", revenue: 5240 },
  { date: "2023-10-14", label: "Oct 14", revenue: 5880 },
  { date: "2023-10-16", label: "Oct 16", revenue: 5510 },
  { date: "2023-10-18", label: "Oct 18", revenue: 4740 },
  { date: "2023-10-20", label: "Oct 20", revenue: 4890 },
  { date: "2023-10-22", label: "Oct 22", revenue: 5210 },
  { date: "2023-10-24", label: "Oct 24", revenue: 4520 },
];

/**
 * Colours come from the categorical palette in fixed slot order.
 *
 * They are CSS variable references rather than hex so the palette lives in one
 * place, and they must stay in this order: the ordering is what was validated
 * for colour-blind separability, so re-sorting the array would silently break
 * it for a reader who cannot rely on hue.
 */
export const categoryShares: CategoryShare[] = [
  { id: "tools", label: "Tools", share: 0.45, color: "var(--color-chart-1)" },
  {
    id: "plumbing",
    label: "Plumbing",
    share: 0.3,
    color: "var(--color-chart-2)",
  },
  {
    id: "electrical",
    label: "Electrical",
    share: 0.25,
    color: "var(--color-chart-3)",
  },
];

export const topProducts: TopProduct[] = [
  { id: "makita-18v", name: "Makita 18V Drill", unitsSold: 142 },
  { id: "pvc-2in-10ft", name: 'PVC Pipe 2" (10ft)', unitsSold: 320 },
  { id: "led-9w", name: "LED Bulb 9W", unitsSold: 450 },
  { id: "cement-50kg", name: "Cement Bag 50kg", unitsSold: 85 },
  { id: "paint-roller", name: "Paint Roller Kit", unitsSold: 110 },
];

export const dailySummary: DailySummaryRow[] = [
  {
    date: "2023-10-24",
    label: "Oct 24, 2023",
    transactions: 124,
    revenue: 4520.0,
    profit: 1356.0,
    trend: "up",
  },
  {
    date: "2023-10-23",
    label: "Oct 23, 2023",
    transactions: 110,
    revenue: 3980.5,
    profit: 1194.15,
    trend: "up",
  },
  {
    date: "2023-10-22",
    label: "Oct 22, 2023",
    transactions: 145,
    revenue: 5210.25,
    profit: 1563.07,
    trend: "up",
  },
  {
    date: "2023-10-21",
    label: "Oct 21, 2023",
    transactions: 85,
    revenue: 2850.0,
    profit: 855.0,
    trend: "down",
  },
  {
    date: "2023-10-20",
    label: "Oct 20, 2023",
    transactions: 130,
    revenue: 4890.0,
    profit: 1467.0,
    trend: "up",
  },
];
