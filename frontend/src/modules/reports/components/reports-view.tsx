"use client";

import * as React from "react";

import { StatCardGrid } from "@/shared/components/ui/stat-card";

import {
  categoryShares,
  dailySummary,
  defaultPeriod,
  reportPeriods,
  reportStats,
  salesTrend,
  topProducts,
} from "../constants/reports-data";
import { CategoryDonut } from "./category-donut";
import { DailySummary } from "./daily-summary";
import { PeriodToolbar } from "./period-toolbar";
import { SalesTrendChart } from "./sales-trend-chart";
import { TopSellingProducts } from "./top-selling-products";

/**
 * Interactive body of the reports screen.
 *
 * Owns the selected period, which is why it is a Client Component. It imports
 * its data directly rather than receiving it from the page: the stat models
 * carry icon components, and a function cannot cross the server/client
 * boundary as a prop.
 *
 * Once the reporting endpoints exist, the period belongs in a URL search param
 * so the page can stay a Server Component and fetch for the chosen window.
 */
export function ReportsView() {
  const [period, setPeriod] = React.useState(defaultPeriod.value);

  return (
    <>
      <PeriodToolbar
        periods={reportPeriods}
        value={period}
        onChange={setPeriod}
      />

      <div className="mt-5">
        <StatCardGrid stats={reportStats} />
      </div>

      {/*
        Two columns only from `xl`. At `lg` the navigation rail already claims
        256px, which leaves too little width for a trend line and a donut side
        by side without both becoming unreadable.
      */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SalesTrendChart points={salesTrend} />
        </div>
        <div className="min-w-0">
          <CategoryDonut shares={categoryShares} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <TopSellingProducts products={topProducts} />
        </div>
        <div className="min-w-0">
          <DailySummary rows={dailySummary} />
        </div>
      </div>
    </>
  );
}
