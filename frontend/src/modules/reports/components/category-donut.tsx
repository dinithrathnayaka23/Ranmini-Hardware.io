"use client";

import * as React from "react";

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatPercent } from "@/shared/lib/format";

import { donutSegmentPath } from "../lib/chart-geometry";
import type { CategoryShare } from "../types/reports.types";

const SIZE = 200;
const OUTER_RADIUS = 92;
const INNER_RADIUS = 62;
/** Fraction of the circle left blank between slices — the 2px surface gap. */
const GAP_FRACTION = 0.005;

/**
 * Revenue split by product category.
 *
 * Three well-separated shares, which is what a donut is actually good for —
 * it would be the wrong form for values close enough to need comparing.
 *
 * Every share is printed in the legend, so the chart never depends on colour
 * alone. That matters twice over here: it is the accessibility fallback for a
 * colour-blind reader, and one palette slot sits below 3:1 contrast against
 * white, which obliges visible labels rather than a bare swatch.
 */
export function CategoryDonut({ shares }: { shares: CategoryShare[] }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Running offsets turn a list of shares into arc start/end positions.
  let cursor = 0;
  const segments = shares.map((share) => {
    const start = cursor;
    cursor += share.share;
    return { share, start, end: cursor };
  });

  const leading = shares.reduce((best, share) =>
    share.share > best.share ? share : best,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Distribution</CardTitle>
      </CardHeader>

      <CardBody className="flex flex-col items-center">
        <svg
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`Revenue share by category. ${shares
            .map((share) => `${share.label} ${formatPercent(share.share)}`)
            .join(", ")}.`}
        >
          {segments.map(({ share, start, end }) => (
            <path
              key={share.id}
              // The gap is taken out of each slice's own sweep, so the surface
              // shows through between them. A stroke would add ink that is not
              // data; absence of ink is what separates the marks.
              d={donutSegmentPath(
                start + GAP_FRACTION,
                end - GAP_FRACTION,
                OUTER_RADIUS,
                INNER_RADIUS,
                SIZE / 2,
              )}
              fill={share.color}
              opacity={activeId && activeId !== share.id ? 0.35 : 1}
              onPointerEnter={() => setActiveId(share.id)}
              onPointerLeave={() => setActiveId(null)}
              className="transition-opacity duration-150"
            />
          ))}

          {/* The hole is dead space otherwise; the leading category is the one
              fact a reader takes from a share chart at a glance. */}
          <text
            x={SIZE / 2}
            y={SIZE / 2 - 4}
            textAnchor="middle"
            className="fill-ink text-xl font-bold"
          >
            {formatPercent(
              activeId
                ? shares.find((share) => share.id === activeId)!.share
                : leading.share,
            )}
          </text>
          <text
            x={SIZE / 2}
            y={SIZE / 2 + 16}
            textAnchor="middle"
            className="fill-muted text-[11px]"
          >
            {activeId
              ? shares.find((share) => share.id === activeId)!.label
              : leading.label}
          </text>
        </svg>

        <ul className="mt-6 w-full space-y-2.5">
          {shares.map((share) => (
            <li
              key={share.id}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-opacity",
                activeId && activeId !== share.id && "opacity-50",
              )}
              onPointerEnter={() => setActiveId(share.id)}
              onPointerLeave={() => setActiveId(null)}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: share.color }}
              />
              {/* Labels wear text tokens, never the series colour — the swatch
                  beside them is what carries identity. */}
              <span className="min-w-0 flex-1 truncate text-ink-soft">
                {share.label}
              </span>
              <span className="shrink-0 font-semibold text-ink tabular-nums">
                {formatPercent(share.share)}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
