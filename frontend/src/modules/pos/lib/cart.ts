import type { OrderLine, OrderTotals } from "../types/pos.types";

/**
 * Order arithmetic, kept as pure functions.
 *
 * IMPORTANT: these totals are for display only. The figure that is charged,
 * printed on the receipt and written to the ledger must be recomputed by the
 * Spring Boot service from the line items it receives. A browser is not a
 * trustworthy calculator — anyone can edit the number it posts — and this is
 * money.
 *
 * <p>Display-only does not mean approximate. The cashier reads this total out
 * to the customer and takes cash against it, so it has to be the same figure
 * the server will charge, to the cent. Every step below therefore mirrors
 * `Money` on the backend exactly: round to whole cents immediately, half up,
 * discount off the subtotal first, then tax on what is left.
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

/**
 * A percentage of an amount, in whole cents.
 *
 * <p>Works on cents rather than rupees so the multiplication happens on an
 * exact integer. `subtotal * rate / 100` in floating point can land a true
 * half-cent just below the boundary — 1.005 is really 1.00499999999999989 — and
 * round down where the server's `BigDecimal` rounds up. One cent out on a
 * receipt is the kind of thing a customer notices and nobody can explain.
 */
function percentageOfCents(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/**
 * Subtotal, discount, tax and total for the current order.
 *
 * @param taxRate the shop's rate as a percentage, e.g. 15 for 15%. Comes from
 *   Settings → Business Logic, which is the same value the backend applies at
 *   checkout. Passing zero simply omits the tax line.
 */
export function calculateTotals(
  lines: OrderLine[],
  discountPercent: number,
  taxRate = 0,
): OrderTotals {
  const subtotalCents = lines.reduce(
    (running, line) => running + Math.round(lineTotal(line) * 100),
    0,
  );

  const discountCents = percentageOfCents(
    subtotalCents,
    clampDiscountPercent(discountPercent),
  );

  // Derived by subtraction rather than a second percentage calculation, so the
  // figures on screen are guaranteed to reconcile.
  const discountedCents = subtotalCents - discountCents;

  const rate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0;
  const taxCents = percentageOfCents(discountedCents, rate);

  return {
    subtotal: subtotalCents / 100,
    discountAmount: discountCents / 100,
    taxRate: rate,
    taxAmount: taxCents / 100,
    total: (discountedCents + taxCents) / 100,
    itemCount: lines.reduce((running, line) => running + line.quantity, 0),
  };
}
