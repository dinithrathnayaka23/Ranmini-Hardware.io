import type { OrderLine, OrderTotals } from "../types/pos.types";

/**
 * Order arithmetic, kept as pure functions.
 *
 * IMPORTANT: these totals are for display only. The figure that is charged,
 * printed on the receipt and written to the ledger must be recomputed by the
 * Spring Boot service from the line items it receives. A browser is not a
 * trustworthy calculator — anyone can edit the number it posts — and this is
 * money.
 */

/**
 * Rounds to whole cents.
 *
 * Prices are held as ordinary numbers, so a percentage discount lands on values
 * like 9149.999999999998. Rounding at every step keeps the displayed subtotal,
 * discount and total adding up, which is the first thing a cashier checks when
 * a customer queries a bill.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** What one line is worth: unit price times quantity. */
export function lineTotal(line: OrderLine): number {
  return roundMoney(line.unitPrice * line.quantity);
}

/** Discounts are entered as a percentage, so they cannot exceed the order. */
export function clampDiscountPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100);
}

/** Subtotal, discount and total for the current order. */
export function calculateTotals(
  lines: OrderLine[],
  discountPercent: number,
): OrderTotals {
  const subtotal = roundMoney(
    lines.reduce((running, line) => running + lineTotal(line), 0),
  );

  const discountAmount = roundMoney(
    (subtotal * clampDiscountPercent(discountPercent)) / 100,
  );

  return {
    subtotal,
    discountAmount,
    // Derived by subtraction rather than by a second percentage calculation, so
    // the three figures on screen are guaranteed to reconcile.
    total: roundMoney(subtotal - discountAmount),
    itemCount: lines.reduce((running, line) => running + line.quantity, 0),
  };
}
