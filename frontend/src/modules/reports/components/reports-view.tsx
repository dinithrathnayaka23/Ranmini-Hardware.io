"use client";

import { Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { StatCardGrid, type StatCardModel } from "@/shared/components/ui/stat-card";
import { formatCompactCurrency, formatCount, formatCurrency } from "@/shared/lib/format";

import type { ReportsView as ReportsData } from "../services/reports.server";
import { reportPeriods } from "../constants/reports-data";
import { CategoryDonut } from "./category-donut";
import { DailySummary } from "./daily-summary";
import { PeriodToolbar } from "./period-toolbar";
import { SalesTrendChart } from "./sales-trend-chart";
import { TopSellingProducts } from "./top-selling-products";
import { useCurrency } from "@/shared/components/shop-provider";

/**
 * Interactive body of the reports screen.
 *
 * <p>Receives its figures from the server and owns only the selected period,
 * which it keeps in the URL rather than in component state. That is what makes
 * a reporting window shareable and survive a refresh — and it means the data is
 * fetched on the server for the chosen range instead of being filtered in the
 * browser from a payload that already arrived.
 *
 * <p>The stat cards are built here rather than passed in because they carry
 * icon components, and a function cannot cross the server/client boundary as a
 * prop. Only the plain numbers make the trip.
 */
export function ReportsView({ data }: { data: ReportsData }) {
  const currency = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const selected = searchParams.get("period") ?? reportPeriods[0].value;

  const handlePeriodChange = (value: string) => {
    const range = rangeFor(value);
    const params = new URLSearchParams();
    params.set("period", value);
    params.set("from", range.from);
    params.set("to", range.to);

    // A transition keeps the current figures on screen while the new ones load,
    // rather than blanking the page every time somebody changes the window.
    startTransition(() => router.push(`?${params}`));
  };

  // The symbol is read here rather than inside buildStats: a hook belongs in a
  // component, and a plain helper that called one would only work by accident
  // of where it happened to be invoked.
  const stats = buildStats(data, currency);

  return (
    <>
      <PeriodToolbar
        periods={reportPeriods}
        value={selected}
        onChange={handlePeriodChange}
        // The range the API resolved, not the one the URL happens to carry:
        // with no range at all the backend picks the current month, and the
        // printed report has to cover the days on screen.
        exportHref={`/api/reports/export?from=${data.from}&to=${data.to}`}
      />

      {/* Dimmed while the new range loads, so it is obvious the figures on
          screen are the previous ones rather than the answer. */}
      <div
        className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}
        aria-busy={isPending}
      >
        <p className="mt-4 text-sm text-muted">Showing {data.periodLabel}</p>

        <div className="mt-3">
          <StatCardGrid stats={stats} />
        </div>

        {/*
          Two columns only from `xl`. At `lg` the navigation rail already claims
          256px, which leaves too little width for a trend line and a donut side
          by side without both becoming unreadable.
        */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <SalesTrendChart points={data.salesTrend} />
          </div>
          <div className="min-w-0">
            <CategoryDonut shares={data.categoryShares} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="min-w-0">
            <TopSellingProducts products={data.topProducts} />
          </div>
          <div className="min-w-0">
            <DailySummary rows={data.dailyRows} />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The four figures above the charts.
 *
 * <p>Captions state what the number is rather than inventing a comparison. The
 * API reports one window at a time, so a "+12% on last month" here would be a
 * figure nobody computed.
 */
function buildStats(data: ReportsData, symbol: string): StatCardModel[] {
  return [
    {
      id: "revenue",
      label: "Revenue",
      value: formatCompactCurrency(data.totals.revenue, symbol),
      icon: TrendingUp,
      accent: "brand",
      caption: { label: "Net of discounts", accent: "neutral" },
    },
    {
      id: "profit",
      label: "Profit",
      value: formatCompactCurrency(data.totals.profit, symbol),
      icon: Wallet,
      accent: "success",
      caption: { label: "After cost and tax", accent: "neutral" },
    },
    {
      id: "transactions",
      label: "Transactions",
      value: formatCount(data.totals.transactions),
      icon: Receipt,
      accent: "brand",
      caption: {
        label: `${formatCount(data.totals.unitsSold)} items sold`,
        accent: "neutral",
      },
    },
    {
      id: "average-sale",
      label: "Average Sale",
      value: formatCurrency(data.totals.averageSale, symbol),
      icon: ShoppingBag,
      accent: "warning",
      caption: { label: "Per transaction", accent: "neutral" },
    },
  ];
}

/**
 * Turns a period choice into the date range the API expects.
 *
 * <p>Computed in the browser so the range follows the shop's own clock. A
 * server-side "today" would be the server's day, which is the wrong one the
 * moment the service is hosted outside Sri Lanka.
 */
function rangeFor(period: string): { from: string; to: string } {
  const today = new Date();
  const to = toIsoDate(today);

  switch (period) {
    case "today":
      return { from: to, to };
    case "last-7":
      return { from: toIsoDate(addDays(today, -6)), to };
    case "last-30":
      return { from: toIsoDate(addDays(today, -29)), to };
    case "this-month":
    default:
      return {
        from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        to,
      };
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Local calendar date, not UTC — a shop's day is its own. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
