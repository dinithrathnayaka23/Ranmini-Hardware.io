import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { routes } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatCount, formatCurrency } from "@/shared/lib/format";

import type { DailySummaryRow } from "../types/reports.types";
import { ReportEmpty } from "./report-empty";
import { useCurrency } from "@/shared/components/shop-provider";

/**
 * Day-by-day figures behind the trend line.
 *
 * This table is also what lets the chart's tooltip stay an enhancement rather
 * than a gate: every value the crosshair reveals is printed here, reachable
 * without a pointer.
 */
export function DailySummary({ rows }: { rows: DailySummaryRow[] }) {
  const currency = useCurrency();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Summary</CardTitle>
        {/* Points at the most recent day in the range rather than at the screen
            with no date: "view details" meaning "today, which may be outside
            the period you are looking at" is a small lie the reader only
            notices after wondering why the figures do not match. */}
        <Link
          href={
            rows.length > 0
              ? `${routes.adminReportsDaily}?date=${rows[rows.length - 1].date}`
              : routes.adminReportsDaily
          }
          className="shrink-0 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          View All Details
        </Link>
      </CardHeader>

      {rows.length === 0 ? (
        <ReportEmpty message="Daily figures appear here once there are sales in the selected range." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas-subtle text-left text-xs text-muted">
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Transactions
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Revenue
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Profit
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  Trend
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const isUp = row.trend === "up";
                const TrendIcon = isUp ? TrendingUp : TrendingDown;

                return (
                  <tr
                    key={row.date}
                    className="border-b border-line last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="px-5 py-3 text-left font-normal whitespace-nowrap text-ink"
                    >
                      {/* The date is the drill-down. A figure in this table that
                          looks wrong is answered by the receipts behind it, and
                          this is the shortest route to them. */}
                      <Link
                        href={`${routes.adminReportsDaily}?date=${row.date}`}
                        className="font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
                      >
                        {row.label}
                      </Link>
                    </th>
                    <td className="px-3 py-3 text-right text-ink-soft tabular-nums">
                      {formatCount(row.transactions)}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-ink-soft tabular-nums">
                      {formatCurrency(row.revenue, currency)}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-ink-soft tabular-nums">
                      {formatCurrency(row.profit, currency)}
                    </td>
                    <td className="px-5 py-3">
                      {/* `relative` is load-bearing: Tailwind's `sr-only` is
                          position:absolute, and without a positioned ancestor it
                          resolves against the document, escaping the scroll
                          container and stretching the page in both axes. */}
                      <span className="relative flex items-center justify-end">
                        {/* The arrow shape carries the direction as well as the
                          colour, so the column still reads without hue. */}
                        <TrendIcon
                          aria-hidden
                          className={cn(
                            "size-4",
                            isUp ? "text-success" : "text-danger",
                          )}
                        />
                        <span className="sr-only">
                          {isUp
                            ? "Up on the previous day"
                            : "Down on the previous day"}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
