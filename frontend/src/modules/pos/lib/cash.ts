import { roundMoney } from "./cart";

/**
 * Counting cash at the counter.
 *
 * <p>Pure functions, deliberately: the change a customer is handed is checked
 * against the coins in the drawer, so the arithmetic that produced it has to be
 * something anyone can read and test without a browser.
 *
 * <p>The till previews the change; the backend computes the figure that is
 * stored and printed, from the amount tendered it is sent. The two agree
 * because both are a subtraction against the same total — but the server's is
 * the one that counts, exactly as with the order total itself.
 */

/** Rounds an amount up to a multiple of `step`, leaving it alone if it is one. */
function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/** The first multiple of `step` strictly above `value`. */
function nextAbove(value: number, step: number): number {
  return (Math.floor(value / step) + 1) * step;
}

/**
 * The amounts a customer is most likely to hand over for a given total.
 *
 * <p>Not a fixed list of denominations. A cashier at a hardware counter is
 * rarely given a single note: for a bill of 3,247.50 the customer produces
 * 3,300 in small change, or 4,000, or a 5,000 note. Deriving the three
 * suggestions from the bill names those cases directly whatever it happens to
 * be, where a fixed list of {500, 1000, 5000} would offer amounts below the
 * total half the time.
 *
 * <p>The three are: rounded up to the nearest hundred, the next thousand above,
 * and the next five thousand above. The first uses plain rounding because a
 * bill that is already a round hundred needs no such suggestion — paying it
 * exactly is what the Exact button is for. The other two step past the total
 * even when it sits exactly on the mark, because a customer settling a bill of
 * exactly 5,000 hands over a larger note, and a suggestion of 5,000 there would
 * simply be Exact under another name. Without that, a round total offered no
 * quick amounts at all.
 *
 * <p>Anything not greater than the total is then dropped, since a "quick
 * amount" that owes no change is a slower way of pressing Exact.
 */
export function quickTenderAmounts(total: number): number[] {
  if (!Number.isFinite(total) || total <= 0) return [];

  const candidates = [ceilTo(total, 100), nextAbove(total, 1000), nextAbove(total, 5000)];

  return [...new Set(candidates)].filter((amount) => amount > total).sort((a, b) => a - b);
}

/**
 * What the cashier has typed, as an amount — or null when there is nothing
 * usable there.
 *
 * <p>Null rather than zero for an empty box. The two are different statements:
 * an empty box means "the customer paid the exact amount, do not record a
 * tender", while a typed zero would be a claim that they handed over nothing,
 * which the backend correctly refuses.
 */
export function parseTendered(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return roundMoney(amount);
}

/** Change owed, or zero when the customer has not covered the bill yet. */
export function changeFor(tendered: number, total: number): number {
  return roundMoney(Math.max(tendered - total, 0));
}
