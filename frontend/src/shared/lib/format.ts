/**
 * Number formatting helpers.
 *
 * The locale is pinned rather than left to the runtime: a Server Component
 * formats with the server's locale and the browser re-formats with the user's,
 * and if those disagree React reports a hydration mismatch. An explicit locale
 * makes both sides produce the same string.
 */
const LOCALE = "en-US";

const amountFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFormatter = new Intl.NumberFormat(LOCALE);

/** Money without a symbol — the column header or label carries the currency. */
export function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

/** Whole numbers with thousands separators, e.g. 12450 -> "12,450". */
export function formatCount(value: number): string {
  return countFormatter.format(value);
}

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
});

/** Money with the store's symbol, e.g. 4520 -> "$4,520.00". */
export function formatCurrency(value: number, symbol: string): string {
  return `${symbol}${amountFormatter.format(value)}`;
}

/** Compact money for axis ticks, e.g. 4520 -> "$4.5k". */
export function formatCompactCurrency(value: number, symbol: string): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${symbol}${percentFormatter.format(value / 1_000_000)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${symbol}${percentFormatter.format(value / 1_000)}k`;
  }
  return `${symbol}${countFormatter.format(value)}`;
}

/** A share as a whole-ish percentage, e.g. 0.45 -> "45%". */
export function formatPercent(fraction: number): string {
  return `${percentFormatter.format(fraction * 100)}%`;
}
