"use client";

import { Receipt as ReceiptIcon, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disclosure, DisclosureRow } from "@/shared/components/ui/disclosure";
import { EmptyState } from "@/shared/components/ui/empty-state";
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

      {/*
        ------------------------------ Card list ------------------------------
        Below `md`. Seven columns of sales history do not fit a phone, and this
        is a screen an owner opens on one — checking the day's takings from
        somewhere other than the office is most of why it exists.
      */}
      <ul className="divide-y divide-line md:hidden">
        {page.sales.map((sale) => {
          const isOpen = openId === sale.id;
          const isVoided = sale.status === "VOIDED";
          const units = sale.lines.reduce((total, line) => total + line.quantity, 0);

          return (
            <li key={sale.id} className={cn(isVoided && "bg-danger-soft/40")}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium break-all text-ink">
                      {sale.invoiceNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatTime(sale.soldAt)} ·{" "}
                      {sale.tender === "CASH" ? "Cash" : "Card"} ·{" "}
                      {formatCount(units)} {units === 1 ? "item" : "items"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {sale.cashierName ?? "—"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "font-semibold whitespace-nowrap tabular-nums",
                        isVoided ? "text-muted line-through" : "text-ink",
                      )}
                    >
                      {formatCurrency(sale.total, currency)}
                    </p>
                    {isVoided ? (
                      <span className="mt-1 inline-block">
                        <Badge label="Voided" accent="danger" />
                      </span>
                    ) : null}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-expanded={isOpen}
                  aria-controls={`receipt-card-${sale.id}`}
                  onClick={() => setOpenId(isOpen ? null : sale.id)}
                  className="mt-3 w-full"
                >
                  <ReceiptIcon aria-hidden className="size-4" />
                  {isOpen ? "Close receipt" : "Open receipt"}
                </Button>
              </div>

              {/* Grows out of the row it belongs to. The two views each render
                  their own trigger, so the ids have to differ — both lists are
                  in the DOM at once, one of them merely hidden. */}
              <Disclosure open={isOpen} id={`receipt-card-${sale.id}`}>
                <SaleDetail sale={sale} />
              </Disclosure>
            </li>
          );
        })}
      </ul>

      {/*
        ------------------------------- Table --------------------------------
        From `md`, with the columns that answer the first question always
        present and the rest arriving with the width to hold them. Time, invoice
        and total are what the day is read for; who served it and how it was
        paid are follow-up questions.
      */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="px-5 py-3 font-medium">
                Time
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Invoice
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">
                Cashier
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right font-medium lg:table-cell"
              >
                Items
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
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

                    <td className="hidden px-3 py-3.5 text-muted xl:table-cell">
                      {sale.cashierName ?? "—"}
                    </td>
                    <td className="hidden px-3 py-3.5 text-right text-ink-soft tabular-nums lg:table-cell">
                      {formatCount(units)}
                    </td>
                    <td className="hidden px-3 py-3.5 text-muted lg:table-cell">
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
                        aria-controls={`receipt-row-${sale.id}`}
                        onClick={() => setOpenId(isOpen ? null : sale.id)}
                      >
                        <ReceiptIcon aria-hidden className="size-4" />
                        {isOpen ? "Close" : "Open"}
                      </Button>
                    </td>
                  </tr>

                  <DisclosureRow
                    open={isOpen}
                    colSpan={7}
                    id={`receipt-row-${sale.id}`}
                    rowClassName="border-b border-line"
                  >
                    <SaleDetail sale={sale} />
                  </DisclosureRow>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Outside both views rather than inside the table, which is where it used
          to live — so an empty day on a phone showed a bare card with nothing
          in it at all, the one screen size where somebody is most likely to be
          checking the takings from away from the shop. */}
      {page.sales.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No sales on this day"
          message="Nothing was rung up. Pick another trading day above."
        />
      ) : null}

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
