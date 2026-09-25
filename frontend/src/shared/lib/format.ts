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

/**
 * Separator between the symbol and the digits.
 *
 * A glyph ("$") sits flush against the number, but a letter-based symbol
 * ("Rs.") runs into it and has to be spaced.
 *
 * This is an ordinary space, so a price can in principle wrap between the
 * symbol and the figure. Callers that render money in a narrow column are
 * expected to set `whitespace-nowrap`, which is the more reliable fix — a
 * non-breaking space here would not survive a copy-paste into a spreadsheet.
 */
function symbolGap(symbol: string): string {
  return /[a-z]\.?$/i.test(symbol) ? " " : "";
}

/** Money with the store's symbol, e.g. 4520 -> "Rs. 4,520.00". */
export function formatCurrency(value: number, symbol: string): string {
  return `${currencyPrefix(symbol)}${amountFormatter.format(value)}`;
}

/**
 * The symbol and its separator, e.g. "Rs. " — everything before the digits.
 *
 * Exported for the animated figures, which render the digits themselves and
 * need the prefix on its own. Sharing it keeps an animated total and a static
 * one spelled identically.
 */
export function currencyPrefix(symbol: string): string {
  return `${symbol}${symbolGap(symbol)}`;
}

/** The locale and digit options every money figure is formatted with. */
export const AMOUNT_LOCALE = LOCALE;
export const AMOUNT_FORMAT = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

/** Compact money for axis ticks, e.g. 4520 -> "Rs. 4.5k". */
export function formatCompactCurrency(value: number, symbol: string): string {
  const prefix = `${symbol}${symbolGap(symbol)}`;

  if (Math.abs(value) >= 1_000_000) {
    return `${prefix}${percentFormatter.format(value / 1_000_000)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${prefix}${percentFormatter.format(value / 1_000)}k`;
  }
  return `${prefix}${countFormatter.format(value)}`;
}

/** A share as a whole-ish percentage, e.g. 0.45 -> "45%". */
export function formatPercent(fraction: number): string {
  return `${percentFormatter.format(fraction * 100)}%`;
}
