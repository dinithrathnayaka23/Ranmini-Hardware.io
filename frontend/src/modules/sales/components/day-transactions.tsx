"use client";

import { Receipt as ReceiptIcon, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { useCurrency } from "@/shared/components/shop-provider";
import { cn } from "@/shared/lib/cn";
import { formatCount, formatCurrency } from "@/shared/lib/format";

import type { SalesPage } from "../types/sales.types";

import { SaleDetail } from "./sale-detail";

/**
 * Every transaction behind one day's takings.
 *
 * <p>The list the reports screen sends you to when a figure looks wrong, and the
 * screen somebody opens when a customer comes back with a receipt. A row expands
 * into the receipt itself, which can be reprinted or voided.
 *
 * <p>The date and the page live in the URL rather than in state, so a particular
 * day can be bookmarked or sent to somebody, and the browser's back button steps
 * back through the days somebody has been looking at.
 */
export function DayTransactions({
  page,
  date,
}: {
  page: SalesPage;
  /** The trading day being shown, ISO. Owned by the URL, not this component. */
  date: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currency = useCurrency();

  const [openId, setOpenId] = React.useState<string | null>(null);

  const changeDate = (value: string) => {
    if (!value) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value);
    // A different day is a different list; staying on page three of the last
    // one is how a screen ends up saying a busy Saturday had no sales.
    params.delete("page");
    params.delete("invoice");

    router.push(`${pathname}?${params}`);
  };

  const firstRow = (page.page - 1) * page.pageSize + 1;
  const lastRow = firstRow + page.sales.length - 1;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          Trading day
          <input
            type="date"
            value={date}
            onChange={(event) => changeDate(event.target.value)}
            className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-line-strong focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none"
          />
        </label>

        <p className="text-sm text-muted">
          {page.totalEntries === 0
            ? "No sales on this day"
            : `${formatCount(page.totalEntries)} ${
                page.totalEntries === 1 ? "sale" : "sales"
              } on this day`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="px-5 py-3 font-medium">
                Time
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Invoice
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Cashier
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Items
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Paid by
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Total
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Receipt
              </th>
            </tr>
          </thead>

          <tbody>
            {page.sales.map((sale) => {
              const isOpen = openId === sale.id;
              const isVoided = sale.status === "VOIDED";
              const units = sale.lines.reduce((total, line) => total + line.quantity, 0);

              return (
                <React.Fragment key={sale.id}>
                  <tr
                    className={cn(
                      "border-b border-line",
                      isVoided && "bg-danger-soft/40",
                    )}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-ink-soft tabular-nums">
                      {formatTime(sale.soldAt)}
                    </td>

                    <th
                      scope="row"
                      className="px-3 py-3.5 text-left font-medium whitespace-nowrap text-ink"
                    >
                      {sale.invoiceNumber}
                      {isVoided ? (
                        <span className="ml-2 align-middle">
                          <Badge label="Voided" accent="danger" />
                        </span>
                      ) : null}
                    </th>

                    <td className="px-3 py-3.5 text-muted">
                      {sale.cashierName ?? "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right text-ink-soft tabular-nums">
                      {formatCount(units)}
                    </td>
                    <td className="px-3 py-3.5 text-muted">
                      {sale.tender === "CASH" ? "Cash" : "Card"}
                    </td>

                    {/* A voided total is struck through: the figure is still on
                        the receipt, but it is no longer money the shop took. */}
                    <td
                      className={cn(
                        "px-3 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums",
                        isVoided ? "text-muted line-through" : "text-ink",
                      )}
                    >
                      {formatCurrency(sale.total, currency)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-expanded={isOpen}
                        onClick={() => setOpenId(isOpen ? null : sale.id)}
                      >
                        <ReceiptIcon aria-hidden className="size-4" />
                        {isOpen ? "Close" : "Open"}
                      </Button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="border-b border-line">
                      <td colSpan={7} className="p-0">
                        <SaleDetail sale={sale} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {page.sales.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span
              aria-hidden
              className="mx-auto flex size-11 items-center justify-center rounded-full bg-canvas-subtle text-muted"
            >
              <Search className="size-5" />
            </span>
            <p className="mt-3 text-sm text-muted">
              Nothing was rung up on this day. Pick another date above.
            </p>
          </div>
        ) : null}
      </div>

      {page.totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Showing {formatCount(firstRow)} to {formatCount(lastRow)} of{" "}
            {formatCount(page.totalEntries)}
          </p>
          <Pagination page={page.page} totalPages={page.totalPages} />
        </div>
      ) : null}
    </Card>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
