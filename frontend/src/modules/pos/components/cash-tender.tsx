"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { formatAmount, formatCurrency } from "@/shared/lib/format";
import { useCurrency } from "@/shared/components/shop-provider";

import { changeFor, parseTendered, quickTenderAmounts } from "../lib/cash";

/**
 * Cash received, and the change to hand back.
 *
 * <p>The one thing a cashier does on every cash sale that the till used to
 * leave them to do in their head. The backend has always accepted an amount
 * tendered and returned the change; nothing sent it, so every cash sale was
 * recorded as if the customer had produced the exact money and the cashier
 * worked out the difference themselves. Getting that wrong is the most common
 * and most expensive mistake at a counter, and the only one the customer
 * notices immediately.
 *
 * <p>Shown only for cash. A card charges the exact amount, so a "received" box
 * beside it would be a question with one possible answer.
 *
 * <p>Leaving the box empty is a legitimate answer, not an incomplete form: it
 * means the customer paid the exact amount. That keeps the fast path — most
 * sales at a hardware counter are settled with a note the cashier does not need
 * help subtracting — at exactly the number of taps it was before.
 */
export function CashTender({
  total,
  value,
  onValueChange,
}: {
  total: number;
  /** The typed amount, kept as text so an empty box stays empty. */
  value: string;
  onValueChange: (value: string) => void;
}) {
  const currency = useCurrency();
  const inputId = React.useId();

  const tendered = parseTendered(value);
  const quickAmounts = React.useMemo(() => quickTenderAmounts(total), [total]);

  // Typed something, but not enough to cover the bill. Worth saying out loud
  // rather than silently disabling pay: the usual cause is that the cashier
  // added another item after the customer handed the money over, and the fix
  // is to ask for more, not to hunt for a broken control.
  const isShort = tendered !== null && tendered < total;
  const change = tendered !== null && !isShort ? changeFor(tendered, total) : null;

  return (
    <div className="mt-3 rounded-[10px] border border-line bg-surface p-3">
      {/* Quick amounts first: they are what the cashier reaches for, and the
          keyboard is a fallback for the awkward totals they do not cover. */}
      <div className="flex flex-wrap gap-2">
        <QuickAmount
          isSelected={tendered !== null && tendered === total}
          onClick={() => onValueChange(total.toFixed(2))}
        >
          Exact
        </QuickAmount>

        {quickAmounts.map((amount) => (
          <QuickAmount
            key={amount}
            isSelected={tendered === amount}
            onClick={() => onValueChange(amount.toFixed(2))}
          >
            {formatAmount(amount).replace(".00", "")}
          </QuickAmount>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm text-ink-soft">
          Cash received
        </label>

        <div className="flex items-center gap-2">
          {value !== "" ? (
            <button
              type="button"
              onClick={() => onValueChange("")}
              className="rounded-md px-1.5 py-1 text-xs font-medium text-muted transition-colors duration-150 hover:bg-canvas-subtle hover:text-ink"
            >
              Clear
            </button>
          ) : null}

          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder={formatAmount(total)}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            className={cn(
              "h-10 w-32 rounded-md border bg-surface px-2.5 text-right text-base font-semibold text-ink tabular-nums",
              "transition-colors duration-150 placeholder:font-normal placeholder:text-placeholder",
              "focus:ring-2 focus:ring-brand-600/15 focus:outline-none",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
              isShort
                ? "border-danger focus:border-danger"
                : "border-line hover:border-line-strong focus:border-brand-600",
            )}
          />
        </div>
      </div>

      {/*
        The change is the figure the cashier acts on, so it is the largest thing
        in this box — read off the screen while counting notes out of the
        drawer, often without looking back at it.
      */}
      {isShort ? (
        <p className="mt-2.5 text-sm font-medium text-danger" role="status">
          Short by {formatCurrency(total - tendered, currency)}.
        </p>
      ) : change !== null ? (
        <div
          className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-2.5"
          role="status"
        >
          <span className="text-sm font-medium text-ink-soft">Change</span>
          <span className="text-xl font-bold whitespace-nowrap text-success tabular-nums @min-[28rem]:text-2xl">
            {formatCurrency(change, currency)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One suggested amount.
 *
 * <p>Selected state matters here even though pressing one only fills a field:
 * it is the cashier's confirmation that the tap landed on 5,000 rather than
 * 4,000, which on a busy counter is checked at a glance and never re-read.
 */
function QuickAmount({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "h-9 min-w-16 flex-1 touch-manipulation rounded-md px-2.5 text-sm font-medium tabular-nums select-none",
        "transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97]",
        isSelected
          ? "bg-brand-600 text-on-brand"
          : "border border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-brand-50/40",
      )}
    >
      {children}
    </button>
  );
}
