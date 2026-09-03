"use client";

import { Banknote, CreditCard } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";

import type { OrderTotals, TenderMethod } from "../types/pos.types";
import { useCurrency } from "@/shared/components/shop-provider";

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
}: {
  totals: OrderTotals;
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  tender: TenderMethod;
  onTenderChange: (tender: TenderMethod) => void;
  onPay: () => void;
  isPaying: boolean;
  isPayable: boolean;
}) {
  const symbol = useCurrency();

  return (
    <div className="shrink-0 border-t border-line bg-canvas-subtle px-4 py-4 @min-[28rem]:px-5">
      <dl className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm text-ink-soft">Subtotal</dt>
          <dd className="text-sm font-medium whitespace-nowrap text-ink tabular-nums">
            {formatCurrency(totals.subtotal, symbol)}
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
      </dl>

      <hr className="my-4 border-t border-dashed border-line" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xl font-bold tracking-tight text-ink @min-[22rem]:text-2xl @min-[28rem]:text-3xl">
          Total
        </span>
        <span className="text-xl font-bold tracking-tight whitespace-nowrap text-brand-600 tabular-nums @min-[22rem]:text-2xl @min-[28rem]:text-3xl">
          {formatCurrency(totals.total, symbol)}
        </span>
      </div>

      <div
        role="group"
        aria-label="Payment method"
        className="mt-5 grid grid-cols-2 gap-3"
      >
        <TenderButton
          isSelected={tender === "CARD"}
          onClick={() => onTenderChange("CARD")}
          icon={CreditCard}
          label="Card"
        />
        <TenderButton
          isSelected={tender === "CASH"}
          onClick={() => onTenderChange("CASH")}
          icon={Banknote}
          label="Cash (F9)"
        />
      </div>

      <button
        type="button"
        onClick={onPay}
        // Disabled while in flight as well as when empty: a double press is how
        // one basket becomes two charges, and a counter is exactly where an
        // impatient second tap happens.
        disabled={!isPayable || isPaying}
        aria-busy={isPaying}
        className="mt-3 h-13 w-full touch-manipulation rounded-[10px] bg-pay text-base font-semibold text-white shadow-sm select-none
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
 * One payment method.
 *
 * `aria-pressed` rather than a radio group: the pair reads as two toggles in
 * the design, and a cashier switching between them expects a button, not a
 * form control that needs arrow keys.
 */
function TenderButton({
  isSelected,
  onClick,
  icon: Icon,
  label,
}: {
  isSelected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-[10px] text-sm font-medium select-none",
        "transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] @min-[28rem]:h-13",
        isSelected
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : "border border-line bg-surface text-ink hover:border-line-strong hover:bg-brand-50/40",
      )}
    >
      <Icon aria-hidden className="size-[18px]" />
      {label}
    </button>
  );
}
