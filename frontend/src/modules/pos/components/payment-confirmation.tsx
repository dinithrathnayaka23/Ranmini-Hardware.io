"use client";

import { CircleCheck, ShoppingBag } from "lucide-react";
import * as React from "react";

import { PrintReceiptButton } from "@/shared/components/receipt/print-receipt-button";
import { useCurrency } from "@/shared/components/shop-provider";
import { cn } from "@/shared/lib/cn";
import { formatAmount, formatCurrency } from "@/shared/lib/format";

import type { CompletedSale } from "../types/pos.types";

/**
 * The screen a cashier sees the moment a sale goes through.
 *
 * <p>This replaced a small card in the corner of the till. A card was the wrong
 * shape for the job: taking money is the one irreversible thing that happens at
 * this counter, and the confirmation that it worked should be unmissable rather
 * than something that could be mistaken for a toast about a stock warning. It
 * covers the screen so the cashier cannot half-see it, and so the customer
 * standing opposite can see the sale completed too.
 *
 * <p><b>The change is the largest figure on it.</b> That is the number the
 * cashier acts on — read while counting notes out of a drawer, which is the
 * worst possible moment to be hunting for a figure. Everything else on the
 * screen answers a question that only sometimes gets asked, so everything else
 * is smaller.
 *
 * <p><b>It lists what was sold.</b> "What am I paying for?" is asked at the
 * counter constantly, and the answer used to require reprinting the receipt or
 * looking the sale up in the back office. The lines are right here.
 *
 * <p>It never dismisses itself. A cashier reading an amount off the screen must
 * not have it vanish mid-count, and the till behind it is already cleared and
 * waiting, so nothing is held up by leaving it open. Enter or Escape closes it
 * for the next customer; P prints another copy.
 */
export function PaymentConfirmation({
  sale,
  onDone,
}: {
  sale: CompletedSale;
  /** Closes the screen and returns the till to the next customer. */
  onDone: () => void;
}) {
  const currency = useCurrency();
  const doneRef = React.useRef<HTMLButtonElement>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  const isCash = sale.tender === "CASH";
  const hasChange = sale.changeDue > 0;

  // Focus the way out, so a cashier who never touches the mouse can clear this
  // screen with the key their hand is already on.
  React.useEffect(() => {
    doneRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        onDone();
        return;
      }

      // A second copy without reaching for the mouse. Ignored while a modifier
      // is held, so Ctrl+P still opens the browser's own print dialog.
      if ((event.key === "p" || event.key === "P") && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        printRef.current?.querySelector("button")?.click();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDone]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Payment complete"
      // Fixed and full-screen: this sits over the till, which keeps its own
      // state so closing it is instant rather than a re-render of the grid.
      className="fixed inset-0 z-50 flex flex-col bg-canvas-subtle"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-success/20 bg-success-soft px-4 py-3 sm:px-6">
        <CircleCheck aria-hidden className="size-6 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight text-success sm:text-lg">
            Payment complete
          </p>
          <p className="truncate text-xs text-success/80 sm:text-sm">
            {sale.invoiceNumber} · {formatStamp(sale.soldAt)}
            {sale.cashierName ? ` · ${sale.cashierName}` : ""}
          </p>
        </div>
      </header>

      {/*
        Two columns from `lg`, where there is room for the money and the basket
        side by side. Below that they stack and the whole body scrolls — a phone
        cannot show both at once, and the money goes first because it is what
        the next thirty seconds are spent on.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <section
          aria-label="Amount"
          className="flex shrink-0 flex-col justify-center gap-4 px-4 py-6 sm:px-6 lg:w-[clamp(22rem,40%,32rem)] lg:overflow-y-auto"
        >
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
            {hasChange ? (
              <>
                <p className="text-sm font-medium text-ink-soft">Change due</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-success tabular-nums sm:text-5xl">
                  {formatCurrency(sale.changeDue, currency)}
                </p>
                <p className="mt-3 border-t border-dashed border-line pt-3 text-sm text-muted tabular-nums">
                  {formatCurrency(sale.total, currency)} of{" "}
                  {formatCurrency(sale.amountTendered ?? sale.total, currency)} received
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-ink-soft">
                  Paid by {isCash ? "cash" : "card"}
                </p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-ink tabular-nums sm:text-5xl">
                  {formatCurrency(sale.total, currency)}
                </p>
                <p className="mt-3 border-t border-dashed border-line pt-3 text-sm text-muted">
                  {isCash
                    ? "Exact amount — no change to give."
                    : "Charged to the customer's card."}
                </p>
              </>
            )}
          </div>
        </section>

        <section
          aria-label="What was sold"
          className="flex min-h-0 flex-1 flex-col border-t border-line bg-surface lg:border-t-0 lg:border-l"
        >
          <h2 className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-ink sm:px-6">
            <ShoppingBag aria-hidden className="size-4 text-brand-600" />
            {sale.lines.length === 1 ? "1 line" : `${sale.lines.length} lines`}
            <span className="font-normal text-muted">
              · {itemCount(sale)} {itemCount(sale) === 1 ? "item" : "items"}
            </span>
          </h2>

          {/* The only scrolling region on a desktop till, so the totals below
              stay put however long the order was. */}
          <ul className="scroll-slim min-h-0 flex-1 divide-y divide-line overflow-y-auto lg:min-h-0">
            {sale.lines.map((line) => (
              <li
                key={line.productId}
                className="flex items-start justify-between gap-3 px-4 py-2.5 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{line.name}</p>
                  <p className="mt-0.5 text-xs text-muted tabular-nums">
                    {formatAmount(line.unitPrice)} × {line.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium whitespace-nowrap text-ink tabular-nums">
                  {formatCurrency(line.lineTotal, currency)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="shrink-0 space-y-1.5 border-t border-line bg-canvas-subtle px-4 py-3 sm:px-6">
            <Row label="Subtotal" value={formatCurrency(sale.subtotal, currency)} />

            {sale.discountAmount > 0 ? (
              <Row
                label={`Discount ${trimPercent(sale.discountPercent)}%`}
                value={`−${formatCurrency(sale.discountAmount, currency)}`}
                tone="danger"
              />
            ) : null}

            {sale.taxAmount > 0 ? (
              <Row
                label={`Tax ${trimPercent(sale.taxRate)}%`}
                value={formatCurrency(sale.taxAmount, currency)}
              />
            ) : null}

            <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-2">
              <dt className="text-base font-bold tracking-tight text-ink">Total</dt>
              <dd className="text-base font-bold whitespace-nowrap text-ink tabular-nums">
                {formatCurrency(sale.total, currency)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
        {/* A second copy, for the receipt that jammed or the customer who asks
            for one after saying they did not want it. The first copy already
            printed when the sale completed. */}
        <div ref={printRef} className="shrink-0">
          <PrintReceiptButton sale={sale} label="Print receipt" />
        </div>

        <button
          ref={doneRef}
          type="button"
          onClick={onDone}
          className="h-11 flex-1 touch-manipulation rounded-[10px] bg-brand-600 text-sm font-semibold text-white select-none
                     transition-[background-color,transform] duration-150 hover:bg-brand-700 active:scale-[0.99] sm:h-12 sm:text-base"
        >
          New sale
        </button>
      </footer>

      <p className="sr-only">
        Press Enter or Escape to start the next sale, or P to print another
        receipt.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd
        className={cn(
          "text-sm whitespace-nowrap tabular-nums",
          tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Units across the whole sale, not the number of lines. */
function itemCount(sale: CompletedSale): number {
  return sale.lines.reduce((running, line) => running + line.quantity, 0);
}

/** "15%" rather than "15.00%" — trailing zeroes are noise on a summary. */
function trimPercent(rate: number): string {
  return String(Number(rate.toFixed(2)));
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
