import "server-only";

import { adminFetch } from "@/modules/auth/services/guarded-fetch.server";

import type {
  CategoryShare,
  DailySummaryRow,
  SalesPoint,
  TopProduct,
} from "../types/reports.types";

/**
 * The reports screen, from the backend's bundled endpoint.
 *
 * <p>One request for the whole page. The backend already composes the totals,
 * the daily series, the category split and the best sellers, and four separate
 * round trips from a shop's connection would be three too many.
 */

interface ReportBundle {
  from: string;
  to: string;
  totals: {
    transactions: number;
    unitsSold: number;
    revenue: number;
    profit: number;
    averageSale: number;
  };
  daily: {
    date: string;
    transactions: number;
    unitsSold: number;
    revenue: number;
    profit: number;
    discountTotal: number;
  }[];
  categories: { id: string; label: string; revenue: number; share: number }[];
  topProducts: { id: string; name: string; sku: string; unitsSold: number; revenue: number }[];
}

export interface ReportsView {
  /**
   * The range the API actually reported on, in ISO form.
   *
   * <p>Carried through rather than recomputed in the browser, because when the
   * screen asks for no range the backend picks one — the current month — and
   * the export link and the daily drill-down have to name the same days the
   * figures on screen describe.
   */
  from: string;
  to: string;
  totals: ReportBundle["totals"];
  salesTrend: SalesPoint[];
  categoryShares: CategoryShare[];
  topProducts: TopProduct[];
  dailyRows: DailySummaryRow[];
  periodLabel: string;
}

/**
 * Chart colours come from the palette in a fixed order and are never cycled.
 *
 * <p>That ordering is what keeps adjacent slices distinguishable for a
 * colour-blind reader, so a slice must not pick its own colour from its data.
 * Categories beyond the palette fall back to the muted token rather than
 * wrapping around and repeating a colour already in use.
 */
const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
];

export async function fetchReports(from?: string, to?: string): Promise<ReportsView> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const query = params.toString();
  const bundle = await adminFetch<ReportBundle>(
    `/api/v1/reports${query ? `?${query}` : ""}`,
  );

  return {
    from: bundle.from,
    to: bundle.to,
    totals: bundle.totals,
    periodLabel: formatPeriod(bundle.from, bundle.to),

    salesTrend: bundle.daily.map((day) => ({
      date: day.date,
      label: axisFormatter.format(new Date(`${day.date}T00:00:00Z`)),
      revenue: day.revenue,
    })),

    categoryShares: bundle.categories.map((category, index) => ({
      id: category.id ?? `category-${index}`,
      label: category.label ?? "Uncategorised",
      share: category.share,
      color: CHART_COLORS[index] ?? "var(--color-muted)",
    })),

    topProducts: bundle.topProducts.map((product) => ({
      id: product.id,
      name: product.name,
      unitsSold: product.unitsSold,
    })),

    dailyRows: bundle.daily
      // Newest first: the table is read for "what happened recently", while the
      // chart beside it reads left to right through time.
      .slice()
      .reverse()
      .map((day, index, rows) => {
        const previous = rows[index + 1];
        return {
          date: day.date,
          label: rowFormatter.format(new Date(`${day.date}T00:00:00Z`)),
          transactions: day.transactions,
          revenue: day.revenue,
          profit: day.profit,
          // Compared against the day before it, which is the previous element
          // here because the list has been reversed. A day with nothing to
          // compare against reads as up rather than inventing a decline.
          trend: !previous || day.revenue >= previous.revenue ? "up" : "down",
        };
      }),
  };
}

const axisFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const rowFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const periodFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatPeriod(from: string, to: string): string {
  const start = periodFormatter.format(new Date(`${from}T00:00:00Z`));
  const end = periodFormatter.format(new Date(`${to}T00:00:00Z`));
  return start === end ? start : `${start} – ${end}`;
}
