import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { DayTransactions } from "@/modules/sales/components/day-transactions";
import { InvoiceLookup } from "@/modules/sales/components/invoice-lookup";
import {
  fetchDayTotals,
  fetchSaleByInvoice,
  fetchSalesForDay,
} from "@/modules/sales/services/sales.server";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { StatCardGrid, type StatCardModel } from "@/shared/components/ui/stat-card";
import { routes } from "@/shared/config/app.config";
import { getCurrencySymbol } from "@/shared/lib/shop.server";
import {
  formatCompactCurrency,
  formatCount,
  formatCurrency,
} from "@/shared/lib/format";
import { Banknote, Percent, Receipt, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Daily Details",
};

/**
 * `/admin/reports/daily` — every transaction behind one day's takings.
 *
 * <p>This replaced a placeholder that said the screen was still to come. Three
 * jobs, which turn out to be the same screen:
 *
 * <ul>
 *   <li>the drill-down from a figure on the reports chart that looks wrong;
 *   <li>the receipt lookup, for a customer who comes back with their copy;
 *   <li>the place a sale gets voided, which is the only correction the system
 *       allows and had no home at all before this.
 * </ul>
 *
 * <p>The day, the page and the invoice being looked up all live in the URL, so
 * any of them can be bookmarked or handed to somebody else — which matters here
 * more than most places, because the person at the counter and the person who
 * may void a sale are often not the same person.
 *
 * <p>The day's totals come from the pre-aggregated summaries rather than being
 * added up from the rows on screen, so they agree with the same day on the
 * reports chart and stay right when a busy Saturday runs past one page.
 */
export default async function DailyDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; page?: string; invoice?: string }>;
}) {
  const params = await searchParams;

  const date = isIsoDate(params.date) ? params.date : today();
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const invoice = params.invoice?.trim().toUpperCase() ?? "";

  // Independent reads, so they run together rather than adding round trips.
  const [totals, sales, currency, foundSale] = await Promise.all([
    fetchDayTotals(date),
    fetchSalesForDay(date, page),
    getCurrencySymbol("admin"),
    invoice ? fetchSaleByInvoice(invoice) : Promise.resolve(undefined),
  ]);

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Daily Details"
        description={`Every sale rung up on ${formatDay(date)}.`}
        actions={
          <ButtonLink href={routes.adminReports} variant="secondary" size="sm">
            <ArrowLeft aria-hidden className="size-4" />
            Back to Reports
          </ButtonLink>
        }
      />

      <div className="mt-6">
        <StatCardGrid stats={buildStats(totals, currency)} />
      </div>

      <div className="mt-5">
        <InvoiceLookup invoice={invoice} sale={foundSale} />
      </div>

      <div className="mt-5">
        <DayTransactions page={sales} date={date} />
      </div>
    </div>
  );
}

/**
 * The four figures above the list.
 *
 * <p>A day with no sales shows zeroes rather than an empty state: "nothing was
 * sold" is itself the answer somebody came here for, and a blank panel would
 * look like the screen had failed to load.
 */
function buildStats(
  totals: Awaited<ReturnType<typeof fetchDayTotals>>,
  currency: string,
): StatCardModel[] {
  const transactions = totals?.transactions ?? 0;

  return [
    {
      id: "revenue",
      label: "Revenue",
      value: formatCompactCurrency(totals?.revenue ?? 0, currency),
      icon: TrendingUp,
      accent: "brand",
      caption: { label: "Net of discounts", accent: "neutral" },
    },
    {
      id: "profit",
      label: "Profit",
      value: formatCompactCurrency(totals?.profit ?? 0, currency),
      icon: Banknote,
      accent: "success",
      caption: { label: "After cost and tax", accent: "neutral" },
    },
    {
      id: "transactions",
      label: "Transactions",
      value: formatCount(transactions),
      icon: Receipt,
      accent: "brand",
      caption: {
        label:
          totals === null
            ? "No sales on this day"
            : `${formatCount(totals.unitsSold)} units sold`,
        accent: "neutral",
      },
    },
    {
      id: "discounts",
      label: "Discounts Given",
      value: formatCurrency(totals?.discountTotal ?? 0, currency),
      icon: Percent,
      accent: "warning",
      caption: { label: "Across every sale", accent: "neutral" },
    },
  ];
}

/** Today in the browser-independent ISO form the API expects. */
function today(): string {
  // Rendered on the server, whose clock is the shop's. Formatted with the
  // Sri Lanka locale's calendar rather than toISOString(), which would convert
  // to UTC and hand back yesterday for anything before 05:30 local.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isIsoDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDay(date: string): string {
  // Parsed as a plain calendar date at noon UTC, which cannot slip a day either
  // side of a timezone boundary the way midnight can.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
