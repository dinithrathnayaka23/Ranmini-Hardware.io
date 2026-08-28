"use client";

import * as React from "react";

/**
 * Wall clock in the till's top bar.
 *
 * Rendered empty on the server and filled in after mount. The time is by
 * definition different on the server than in the browser a moment later, so
 * rendering it during SSR would guarantee a hydration mismatch; reserving the
 * space with `min-w` keeps the header from shifting when it appears.
 *
 * It re-aligns to the top of each minute rather than ticking on a fixed
 * interval, so the displayed minute never lags the machine's own clock.
 */
export function PosClock() {
  const [label, setLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    let timeoutId: number;

    const tick = () => {
      const now = new Date();
      setLabel(timeFormatter.format(now));

      // Wake up just after the next minute boundary.
      const msToNextMinute =
        60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
      timeoutId = window.setTimeout(tick, msToNextMinute + 50);
    };

    tick();
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <span className="inline-block min-w-16 text-right tabular-nums">
      {label}
    </span>
  );
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
