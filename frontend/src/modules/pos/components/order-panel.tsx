"use client";

import { ShoppingCart, Trash2, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

import type { Cart } from "../lib/use-cart";
import type { TenderMethod } from "../types/pos.types";

import { ORDER_ROW_GRID, OrderLineRow } from "./order-line-row";
import { OrderSummary } from "./order-summary";

/**
 * The order being built, from header to pay button.
 *
 * Three bands stacked vertically: a fixed header, a scrolling list of lines,
 * and a fixed summary. Only the middle band scrolls, so a long order never
 * pushes the total off the screen — on a till that would mean a cashier
 * scrolling to find out what to charge.
 *
 * The panel is a container query root (`@container`). Its width is a clamp
 * against the viewport, so the same screen can hand it anything from 320px to
 * 512px; the rows inside decide their own layout from the width they actually
 * get rather than guessing from the viewport.
 */
export function OrderPanel({
  cart,
  tender,
  onTenderChange,
  onPay,
  isPaying,
  cashTendered,
  onCashTenderedChange,
  onClose,
  closeRef,
}: {
  cart: Cart;
  tender: TenderMethod;
  onTenderChange: (tender: TenderMethod) => void;
  onPay: () => void;
  /** True while a sale is in flight, so the button cannot be pressed twice. */
  isPaying: boolean;
  /** Cash handed over, as typed. Empty means the customer paid the exact amount. */
  cashTendered: string;
  onCashTenderedChange: (value: string) => void;
  /** Only meaningful below `md`, where the panel is a sheet over the grid. */
  onClose?: () => void;
  closeRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const lineCount = cart.lines.length;
  const previousLineCount = React.useRef(lineCount);

  // A newly scanned product is appended to the end of the list, which on a long
  // order is below the fold. Scrolling to it is the confirmation the cashier
  // needs that the scan landed — quantity changes on an existing line are left
  // alone, since that row is already the one being looked at.
  React.useEffect(() => {
    if (lineCount > previousLineCount.current && listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    previousLineCount.current = lineCount;
  }, [lineCount]);

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 sm:h-16 @min-[28rem]:px-5">
        <h2 className="text-base font-semibold tracking-tight text-ink @min-[22rem]:text-lg">
          Current Order
        </h2>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={cart.clear}
            disabled={cart.isEmpty}
            className="inline-flex touch-manipulation items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
            Clear All
          </button>

          {onClose ? (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close the order panel"
              className="inline-flex size-9 touch-manipulation items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-canvas-subtle hover:text-ink md:hidden"
            >
              <X aria-hidden className="size-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Column headings for the rows below. A real <table> would fight the
          scrolling middle band, so the header and the rows share one grid
          template constant instead. Both disappear together on a narrow panel,
          where the rows stack and there are no columns left to label. */}
      <div
        className={cn(
          ORDER_ROW_GRID,
          "hidden shrink-0 border-b border-line bg-canvas-subtle py-2.5 text-xs font-medium text-muted",
        )}
      >
        <span>Item</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Price</span>
      </div>

      {cart.isEmpty ? (
        <EmptyOrder />
      ) : (
        <ul
          ref={listRef}
          className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {cart.lines.map((line) => (
            <OrderLineRow
              key={line.productId}
              line={line}
              onIncrement={cart.increment}
              onDecrement={cart.decrement}
              onSetQuantity={cart.setQuantity}
            />
          ))}
        </ul>
      )}

      <OrderSummary
        totals={cart.totals}
        discountPercent={cart.discountPercent}
        onDiscountChange={cart.setDiscountPercent}
        tender={tender}
        onTenderChange={onTenderChange}
        onPay={onPay}
        isPaying={isPaying}
        cashTendered={cashTendered}
        onCashTenderedChange={onCashTenderedChange}
        // Nothing to charge for is the one state where the commit action would
        // be meaningless, so it is disabled rather than merely ignored.
        isPayable={!cart.isEmpty}
      />
    </div>
  );
}

function EmptyOrder() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-canvas-subtle text-muted"
      >
        <ShoppingCart className="size-6" />
      </span>
      <p className="mt-4 text-sm font-medium text-ink">No items yet</p>
      <p className="mt-1 max-w-56 text-sm text-muted">
        Scan a barcode or tap a product to start the order.
      </p>
    </div>
  );
}
