"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { appConfig } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatAmount, formatCurrency } from "@/shared/lib/format";

import { lineTotal } from "../lib/cart";
import type { OrderLine } from "../types/pos.types";

/**
 * Column template shared by the order rows and the header above them.
 *
 * Exported rather than repeated so the two cannot drift apart: the Qty and
 * Price columns are fixed widths because an `auto` column would size itself to
 * the word "Qty" in the header and to a stepper control in the row, leaving the
 * headings nowhere near the values they label.
 *
 * The switch is a CONTAINER query, not a viewport one. The panel's width is set
 * by a clamp against the viewport, so the same screen can give it anywhere from
 * 320px to 512px depending on the window; only the panel itself knows whether
 * three columns still fit. Below the threshold the row stacks — name on one
 * line, controls and money on the next — which keeps the product name readable
 * instead of truncating it to "Cemex Portla…".
 *
 * 28rem is where the three-column row stops squeezing the name: the Qty and
 * Price tracks plus padding and gaps take a fixed 280px, so a 448px panel is
 * the first that leaves the name a usable ~160px. The supplied design drew this
 * row against a 512px panel, which is why it works there and nowhere narrower.
 */
export const ORDER_ROW_GRID =
  "px-4 @min-[28rem]:grid @min-[28rem]:grid-cols-[minmax(0,1fr)_6.5rem_7rem] " +
  "@min-[28rem]:items-start @min-[28rem]:gap-3 @min-[28rem]:px-5";

/**
 * One line of the current order.
 *
 * The unit price is repeated under the line total as "850.00 × 5" because that
 * is the figure a customer questions at the counter, and a cashier should be
 * able to answer without opening the product again.
 *
 * There is no separate delete control: at a quantity of one the minus button
 * becomes a bin, which is the same tap the cashier was already reaching for.
 * Clearing several units at once is what "Clear All" is for.
 */
export function OrderLineRow({
  line,
  onIncrement,
  onDecrement,
}: {
  line: OrderLine;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
}) {
  const isAtStockCeiling = line.quantity >= line.availableStock;

  return (
    <li
      className={cn(
        ORDER_ROW_GRID,
        "border-b border-line py-3 @min-[28rem]:py-4",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{line.name}</p>
        <p className="mt-0.5 text-xs text-muted">SKU: {line.sku}</p>

        {isAtStockCeiling ? (
          // Explains why the + button has stopped responding, rather than
          // leaving the cashier tapping a dead control.
          <p className="mt-1 text-xs text-warning">
            All {line.availableStock} in stock
          </p>
        ) : null}
      </div>

      {/*
        Stacked below the name on a narrow panel; `contents` dissolves this
        wrapper once the panel is wide enough, so the stepper and the money drop
        straight into the grid as columns two and three.
      */}
      <div className="mt-2 flex items-center justify-between gap-3 @min-[28rem]:contents">
        <div className="flex items-center justify-center gap-1.5">
          <StepperButton
            label={
              line.quantity === 1
                ? `Remove ${line.name} from the order`
                : `Decrease quantity of ${line.name}`
            }
            onClick={() => onDecrement(line.productId)}
          >
            {line.quantity === 1 ? (
              <Trash2 aria-hidden className="size-3.5" />
            ) : (
              <Minus aria-hidden className="size-3.5" />
            )}
          </StepperButton>

          <span
            aria-label={`Quantity ${line.quantity}`}
            className="min-w-6 text-center text-sm font-semibold text-ink tabular-nums"
          >
            {line.quantity}
          </span>

          <StepperButton
            label={`Increase quantity of ${line.name}`}
            disabled={isAtStockCeiling}
            onClick={() => onIncrement(line.productId)}
          >
            <Plus aria-hidden className="size-3.5" />
          </StepperButton>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
            {formatCurrency(lineTotal(line), appConfig.currencySymbol)}
          </p>
          <p className="mt-0.5 text-xs whitespace-nowrap text-muted tabular-nums">
            {formatAmount(line.unitPrice)} × {line.quantity}
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * Square quantity control.
 *
 * 32px is the smallest square that is still comfortable at a counter, and it
 * keeps the line short enough that several orders fit the panel without
 * scrolling. `touch-manipulation` removes the double-tap-to-zoom delay, which
 * otherwise makes a quick correction feel like it was ignored.
 */
function StepperButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex size-8 touch-manipulation items-center justify-center rounded-md border border-line bg-surface text-ink-soft select-none",
        "transition-[color,background-color,border-color,transform] duration-150",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-line-strong hover:bg-canvas-subtle active:scale-90",
      )}
    >
      {children}
    </button>
  );
}
