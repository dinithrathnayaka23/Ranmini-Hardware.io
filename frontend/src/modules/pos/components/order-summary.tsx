"use client";

import { Banknote, CreditCard } from "lucide-react";
import * as React from "react";

import { appConfig } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";

import type { OrderTotals, TenderMethod } from "../types/pos.types";

/**
 * Money, tender and the commit action.
 *
 * Pinned to the bottom of the order panel so the total and the pay button are
 * always in the same place, whatever the order above them is doing. A cashier
 * develops muscle memory for this corner of the screen; it must not move.
 */
export function OrderSummary({
  totals,
  discountPercent,
  onDiscountChange,
  tender,
  onTenderChange,
  onPay,
  isPayable,
}: {
  totals: OrderTotals;
  discountPercent: number;
  onDiscountChange: (percent: number) => void;
  tender: TenderMethod;
  onTenderChange: (tender: TenderMethod) => void;
  onPay: () => void;
  isPayable: boolean;
}) {
  const symbol = appConfig.currencySymbol;

  return (
    <div className="shrink-0 border-t border-line bg-canvas-subtle px-5 py-4">
      <dl className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm text-ink-soft">Subtotal</dt>
          <dd className="text-sm font-medium whitespace-nowrap text-ink">
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
              <span className="text-sm whitespace-nowrap text-danger">
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
              className="h-9 w-20 rounded-md border border-line bg-surface px-2.5 text-right text-sm text-ink
                         placeholder:text-placeholder focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 focus:outline-none"
            />
          </dd>
        </div>
      </dl>

      <hr className="my-4 border-t border-dashed border-line" />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Total
        </span>
        <span className="text-2xl font-bold tracking-tight whitespace-nowrap text-brand-600 sm:text-3xl">
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
        disabled={!isPayable}
        className="mt-3 h-14 w-full rounded-[10px] bg-pay text-lg font-semibold text-white shadow-sm
                   transition-colors hover:bg-pay-strong active:bg-pay-strong
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        Pay &amp; Print Receipt
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
        "inline-flex h-13 items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-colors",
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
