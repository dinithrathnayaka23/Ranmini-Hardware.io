"use client";

import NumberFlow from "@number-flow/react";

import { useCurrency } from "@/shared/components/shop-provider";
import { AMOUNT_FORMAT, AMOUNT_LOCALE, currencyPrefix } from "@/shared/lib/format";

/*
 * Adapted from the UI Layouts "Motion Number" component (MIT) — see
 * THIRD_PARTY_NOTICES.md. The library builds it on NumberFlow; this keeps that
 * and wires it to the shop's currency and the app's number format.
 */

/**
 * A money figure whose digits roll to their new value when it changes.
 *
 * <p><b>Used only where a figure changes in front of someone,</b> which in
 * practice means the till: adding a line or typing a discount changes the total
 * while the cashier is looking at it, and seeing the digits roll confirms the
 * change took effect. A figure that simply loads with the page has nothing to
 * animate from, so reports and the dashboard keep plain text.
 *
 * <p>Formatted with the same locale and prefix as `formatCurrency`, so a total
 * on the till and the same total on the receipt are spelled identically.
 * NumberFlow honours the reduce-motion setting on its own, and the value is
 * still exposed to screen readers as ordinary text.
 */
export function AnimatedCurrency({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const symbol = useCurrency();

  return (
    <NumberFlow
      value={value}
      locales={AMOUNT_LOCALE}
      format={AMOUNT_FORMAT}
      prefix={currencyPrefix(symbol)}
      className={className}
      // Short, like every other movement in the app: the next keystroke is
      // often already on its way.
      transformTiming={{ duration: 350, easing: "ease-out" }}
      spinTiming={{ duration: 350, easing: "ease-out" }}
    />
  );
}

/** A whole-number count that rolls when it changes, e.g. items in a basket. */
export function AnimatedCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <NumberFlow
      value={value}
      locales={AMOUNT_LOCALE}
      className={className}
      transformTiming={{ duration: 300, easing: "ease-out" }}
      spinTiming={{ duration: 300, easing: "ease-out" }}
    />
  );
}
