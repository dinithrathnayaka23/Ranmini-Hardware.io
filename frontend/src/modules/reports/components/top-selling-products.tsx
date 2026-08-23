import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { formatCount } from "@/shared/lib/format";

import type { TopProduct } from "../types/reports.types";

/**
 * Best-selling products as a meter list.
 *
 * Each bar is scaled against the highest seller, so bar length and printed
 * figure always agree. That sounds obvious, but the supplied design had them
 * disagree — a 450-unit line drawn shorter than a 142-unit one — and a bar
 * that contradicts its own number is worse than no bar at all.
 */
export function TopSellingProducts({ products }: { products: TopProduct[] }) {
  const highest = Math.max(...products.map((product) => product.unitsSold), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>

      <CardBody>
        <ol className="space-y-4">
          {products.map((product) => {
            const fill = (product.unitsSold / highest) * 100;

            return (
              <li key={product.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-ink">
                    {product.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {formatCount(product.unitsSold)} units
                  </span>
                </div>

                {/*
                  A track plus a fill from the same ramp: the track states the
                  scale, so a short bar reads as "little of the maximum" rather
                  than as a rendering glitch. The figure above is the direct
                  label, so the value never depends on reading the bar.
                */}
                <div
                  role="img"
                  aria-label={`${formatCount(product.unitsSold)} units sold`}
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-50"
                >
                  <div
                    // Square at the baseline, rounded at the data end — the end
                    // of the bar is the value, so that is the end that is drawn.
                    className="h-full rounded-r-[4px] bg-chart-1"
                    style={{ width: `${fill}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
