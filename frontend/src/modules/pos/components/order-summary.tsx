"use client";

import { Banknote, CreditCard } from "lucide-react";

import { AnimatedCurrency } from "@/shared/components/ui/animated-number";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/shared/components/ui/segmented-control";
import { formatCurrency } from "@/shared/lib/format";

import { parseTendered } from "../lib/cash";
import type { OrderTotals, TenderMethod } from "../types/pos.types";
import { useCurrency } from "@/shared/components/shop-provider";

import { CashTender } from "./cash-tender";

/**
 * Cash first, on the left. It is the default, it is how most of a hardware
 * shop's sales are settled, and a control the cashier reaches for a hundred
 * times a day belongs where the eye lands first.
 */
const TENDER_OPTIONS: readonly SegmentedOption<TenderMethod>[] = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
];

/**
 * Money, tender and the commit action.
 *
 * Pinned to the bottom of the order panel so the total and the pay button are
 * always in the same place, whatever the order above them is doing. A cashier
 * develops muscle memory for this corner of the screen; it must not move.
 *
 * Type and padding step up with the panel's own width rather than the
 * viewport's — a 320px panel on a tablet needs the smaller "Total" or the
 * figure beside it wraps onto its own line.
 */
export function OrderSummary({
  totals,
  discountPercent,
  onDiscountChange,
  tender,
  onTenderChange,
  onPay,
  isPaying,
  isPayable,
  cashTendered,
  onCashTenderedChange,
}: {
  totals: OrderTotals;
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  tender: TenderMethod;
  onTenderChange: (tender: TenderMethod) => void;
  onPay: () => void;
  isPaying: boolean;
  isPayable: boolean;
  /** Cash handed over, as typed. Empty means the customer paid the exact amount. */
  cashTendered: string;
  onCashTenderedChange: (value: string) => void;
}) {
  const symbol = useCurrency();

  // Pressing pay with less than the bill in the box would be refused by the
  // backend anyway; stopping it here turns a rejected sale with a customer
  // waiting into a button that plainly is not ready yet.
  const tendered = tender === "CASH" ? parseTendered(cashTendered) : null;
  const isShortOfTotal = tendered !== null && tendered < totals.total;

  return (
    <div className="shrink-0 border-t border-line bg-canvas-subtle px-4 py-4 @min-[28rem]:px-5">
      <dl className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm text-ink-soft">Subtotal</dt>
          <dd className="text-sm font-medium whitespace-nowrap text-ink tabular-nums">
            <AnimatedCurrency value={totals.subtotal} />
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt>
            <label htmlFor="order-discount" className="text-sm text-ink-soft">
              Discount
            </label>
          </dt>
          <dd className="flex items-center gap-2">
            {/* The money taken off is shown beside the input: a percentage on
                its own does not tell the cashier what the customer is saving. */}
            {totals.discountAmount > 0 ? (
              <span className="text-sm whitespace-nowrap text-danger tabular-nums">
                −{formatCurrency(totals.discountAmount, symbol)}
              </span>
            ) : null}

            <input
              id="order-discount"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={1}
              placeholder="%"
              value={discountPercent === 0 ? "" : discountPercent}
              onChange={(event) =>
                onDiscountChange(
                  // An empty field means "no discount" rather than NaN.
                  event.target.value === "" ? 0 : Number(event.target.value),
                )
              }
              aria-label="Discount percentage"
              className="h-9 w-18 rounded-md border border-line bg-surface px-2.5 text-right text-sm text-ink tabular-nums
                         transition-colors duration-150 placeholder:text-placeholder hover:border-line-strong
                         focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 focus:outline-none
                         [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </dd>
        </div>

        {/*
          Shown only when the shop charges tax, so a shop that does not is not
          given a permanent "Tax 0%" row to read past. When it is shown it is
          not decoration: the total below includes it, and until the till read
          the shop's rate this line was missing while the server charged it
          anyway — so the cashier quoted one price and took another.
        */}
        {totals.taxAmount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-ink-soft">
              Tax{" "}
              <span className="text-muted">
                {formatPercentLabel(totals.taxRate)}
              </span>
            </dt>
            <dd className="text-sm font-medium whitespace-nowrap text-ink tabular-nums">
              {formatCurrency(totals.taxAmount, symbol)}
            </dd>
          </div>
        ) : null}
      </dl>

      <hr className="my-4 border-t border-dashed border-line" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xl font-bold tracking-tight text-ink @min-[22rem]:text-2xl @min-[28rem]:text-3xl">
          Total
        </span>
        {/* The digits roll when the basket changes, which is the confirmation
            a cashier looks for after tapping a product or typing a discount. */}
        <AnimatedCurrency
          value={totals.total}
          className="text-xl font-bold tracking-tight whitespace-nowrap text-brand-600 tabular-nums @min-[22rem]:text-2xl @min-[28rem]:text-3xl"
        />
      </div>

      {/* A sliding highlight rather than two buttons that swap colour: the
          movement makes the switch between tenders impossible to miss. */}
      <SegmentedControl
        label="Payment method"
        options={TENDER_OPTIONS}
        value={tender}
        onChange={onTenderChange}
        tone="brand"
        size="lg"
        fullWidth
        className="mt-5"
      />

      {tender === "CASH" ? (
        <CashTender
          total={totals.total}
          value={cashTendered}
          onValueChange={onCashTenderedChange}
        />
      ) : null}

      <button
        type="button"
        onClick={onPay}
        // Disabled while in flight as well as when empty: a double press is how
        // one basket becomes two charges, and a counter is exactly where an
        // impatient second tap happens.
        disabled={!isPayable || isPaying || isShortOfTotal}
        aria-busy={isPaying}
        className="mt-3 h-13 w-full touch-manipulation rounded-[10px] bg-pay text-base font-semibold text-on-pay shadow-sm select-none
                   transition-[background-color,transform,box-shadow] duration-150 @min-[28rem]:h-14 @min-[28rem]:text-lg
                   hover:bg-pay-strong hover:shadow active:scale-[0.99] active:bg-pay-strong
                   disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm"
      >
        {isPaying ? "Processing…" : "Pay & Print Receipt"}
      </button>
    </div>
  );
}

/**
 * "15%" rather than "15.00%".
 *
 * A rate is set once and read a hundred times a day; trailing zeroes are noise
 * in a panel that is already tight on a tablet.
 */
function formatPercentLabel(rate: number): string {
  return `${Number(rate.toFixed(2))}%`;
}
