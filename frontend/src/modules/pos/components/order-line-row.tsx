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
 * the word "Qty" in the header and to a stepper control in the row, and the
 * headings would sit nowhere near the values they label.
 */
export const ORDER_ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_6.5rem_7rem] gap-3 px-5";

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
    <li className={cn(ORDER_ROW_GRID, "items-start border-b border-line py-4")}>
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
          className="min-w-6 text-center text-sm font-semibold tabular-nums text-ink"
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
        <p className="text-sm font-semibold whitespace-nowrap text-ink">
          {formatCurrency(lineTotal(line), appConfig.currencySymbol)}
        </p>
        <p className="mt-0.5 text-xs whitespace-nowrap text-muted">
          {formatAmount(line.unitPrice)} × {line.quantity}
        </p>
      </div>
    </li>
  );
}

/**
 * Square quantity control.
 *
 * Sized at 32px — comfortably tappable at a counter, while still leaving the
 * line short enough that several orders fit the panel without scrolling.
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
        "inline-flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-soft transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-line-strong hover:bg-canvas-subtle",
      )}
    >
      {children}
    </button>
  );
}
