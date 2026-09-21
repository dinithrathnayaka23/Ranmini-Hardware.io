import "server-only";

import {
  adminFetch,
  adminFetchOrNull,
} from "@/modules/auth/services/guarded-fetch.server";
import { type PageResponse } from "@/shared/lib/api.server";

import type { DayTotals, Sale, SalesPage } from "../types/sales.types";

/**
 * Reading completed sales.
 *
 * <p>Every read here is scoped to a day or to one invoice number. There is
 * deliberately no "all sales" call: that is the one query whose cost grows
 * without bound, and the API refuses it too — an unbounded listing defaults to
 * the last thirty days rather than to everything.
 */

/** How many receipts a page of the day's transactions holds. */
const PAGE_SIZE = 25;

/**
 * Every sale rung up on one trading day.
 *
 * <p>Filed by trading day rather than by timestamp, which is what the backend
 * stores alongside each sale: a receipt written at 23:50 belongs to that day's
 * takings, not to whatever date it happened to be in UTC.
 */
export async function fetchSalesForDay(date: string, page: number): Promise<SalesPage> {
  const params = new URLSearchParams({
    from: date,
    to: date,
    page: String(page),
    size: String(PAGE_SIZE),
  });

  const response = await adminFetch<PageResponse<Sale>>(`/api/v1/sales?${params}`, {
    // Never cached. A voided sale has to disappear from this list the moment it
    // is voided, and somebody reconciling a till at closing time is asking what
    // is true right now.
    cache: "no-store",
  });

  return {
    sales: response.content,
    page: response.page,
    pageSize: response.pageSize,
    totalEntries: response.totalEntries,
    totalPages: response.totalPages,
  };
}

/**
 * One receipt, by the number printed on the customer's copy.
 *
 * <p>Returns null rather than throwing when there is no such invoice: somebody
 * mistyping a number off a crumpled receipt is the ordinary case, and it should
 * render as "no sale with that number" rather than as an error page.
 */
export async function fetchSaleByInvoice(invoiceNumber: string): Promise<Sale | null> {
  return adminFetchOrNull<Sale>(
    `/api/v1/sales/by-invoice/${encodeURIComponent(invoiceNumber)}`,
    { cache: "no-store" },
  );
}

/**
 * A day's totals, from the reporting module's pre-aggregated summaries.
 *
 * <p>Read rather than added up from the transactions on screen, so this figure
 * cannot disagree with the same day on the reports chart — and so it stays
 * right when the day runs to more transactions than one page holds.
 *
 * @returns null for a day with no sales, which is an ordinary state for a
 *   Sunday or a public holiday rather than something to report as missing data
 */
export async function fetchDayTotals(date: string): Promise<DayTotals | null> {
  const params = new URLSearchParams({ from: date, to: date });

  const days = await adminFetch<DayTotals[]>(`/api/v1/reports/daily?${params}`, {
    cache: "no-store",
  });

  return days.at(0) ?? null;
}
