"use client";

import { ShoppingCart, Trash2, X } from "lucide-react";

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
 */
export function OrderPanel({
  cart,
  tender,
  onTenderChange,
  onPay,
  onClose,
}: {
  cart: Cart;
  tender: TenderMethod;
  onTenderChange: (tender: TenderMethod) => void;
  onPay: () => void;
  /** Only rendered below `lg`, where the panel is an overlay. */
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Current Order
        </h2>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={cart.clear}
            disabled={cart.isEmpty}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
            Clear All
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the order panel"
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas-subtle hover:text-ink lg:hidden"
            >
              <X aria-hidden className="size-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Column headings for the rows below. A real <table> would fight the
          scrolling middle band, so the header and the rows share one grid
          template constant instead. */}
      <div
        className={cn(
          ORDER_ROW_GRID,
          "shrink-0 border-b border-line bg-canvas-subtle py-2.5 text-xs font-medium text-muted",
        )}
      >
        <span>Item</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Price</span>
      </div>

      {cart.isEmpty ? (
        <EmptyOrder />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {cart.lines.map((line) => (
            <OrderLineRow
              key={line.productId}
              line={line}
              onIncrement={cart.increment}
              onDecrement={cart.decrement}
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
        // Nothing to charge for is the one state where the commit action would
        // be meaningless, so it is disabled rather than merely ignored.
        isPayable={!cart.isEmpty}
      />
    </div>
  );
}

function EmptyOrder() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
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
