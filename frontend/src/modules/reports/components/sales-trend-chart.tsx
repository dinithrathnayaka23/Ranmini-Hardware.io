"use client";

import * as React from "react";

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { appConfig } from "@/shared/config/app.config";
import { useElementWidth } from "@/shared/hooks/use-element-width";
import { formatCompactCurrency, formatCurrency } from "@/shared/lib/format";

import {
  areaPathFrom,
  axisTicks,
  monotoneLinePath,
  niceCeiling,
  type Point,
} from "../lib/chart-geometry";
import type { SalesPoint } from "../types/reports.types";
import { ReportEmpty } from "./report-empty";

const HEIGHT = 280;
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 } as const;

/**
 * Revenue over the selected period.
 *
 * A single series, so there is no legend — the card title names what the line
 * is. Exact values are reachable without hovering: the Daily Summary table on
 * this same page carries the numbers, which is what lets the tooltip stay an
 * enhancement rather than the only way to read the chart.
 */
export function SalesTrendChart({ points }: { points: SalesPoint[] }) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY = PADDING.top + plotHeight;

  const maxRevenue = niceCeiling(
    Math.max(...points.map((point) => point.revenue), 0),
  );

  const coordinates = React.useMemo<Point[]>(() => {
    if (plotWidth <= 0 || points.length === 0) return [];

    const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;

    return points.map((point, index) => ({
      x: PADDING.left + step * index,
      y: PADDING.top + plotHeight - (point.revenue / maxRevenue) * plotHeight,
    }));
  }, [points, plotWidth, plotHeight, maxRevenue]);

  const linePath = monotoneLinePath(coordinates);
  const areaPath = areaPathFrom(linePath, coordinates, baselineY);

  /** The crosshair snaps to whichever point is nearest the pointer's x. */
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (coordinates.length === 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;

    let nearest = 0;
    let smallestGap = Number.POSITIVE_INFINITY;

    coordinates.forEach((coordinate, index) => {
      const gap = Math.abs(coordinate.x - pointerX);
      if (gap < smallestGap) {
        smallestGap = gap;
        nearest = index;
      }
    });

    setActiveIndex(nearest);
  };

  const activePoint = activeIndex === null ? null : points[activeIndex];
  const activeCoordinate =
    activeIndex === null ? null : coordinates[activeIndex];

  // With no points the axis would still be drawn, labelled Rs. 0 to Rs. 1 from
  // the niceCeiling of nothing — a chart with a scale invented out of no data,
  // which reads as broken rather than empty.
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Trends</CardTitle>
        </CardHeader>
        <CardBody>
          <ReportEmpty message="The revenue trend appears here once there are sales in the selected range." />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trends</CardTitle>
      </CardHeader>

      <CardBody>
        <div ref={containerRef} className="relative w-full">
          {width > 0 ? (
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              // The zero is not decoration: spreading an empty array into
              // Math.max yields -Infinity, which a screen reader would read out
              // as "minus infinity rupees".
              aria-label={`Revenue by day. Highest ${formatCurrency(
                Math.max(...points.map((p) => p.revenue), 0),
                appConfig.currencySymbol,
              )}.`}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setActiveIndex(null)}
              className="touch-pan-y"
            >
              {/* Gridlines: hairline, solid, one step off the surface. They sit
                  behind everything so they never compete with the data. */}
              {axisTicks(maxRevenue).map((tick) => {
                const y =
                  PADDING.top + plotHeight - (tick / maxRevenue) * plotHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={PADDING.left}
                      x2={width - PADDING.right}
                      y1={y}
                      y2={y}
                      stroke="var(--color-chart-grid)"
                      strokeWidth={1}
                    />
                    <text
                      x={PADDING.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-muted text-[11px]"
                    >
                      {formatCompactCurrency(tick, appConfig.currencySymbol)}
                    </text>
                  </g>
                );
              })}

              {/* Area wash under the line, then the line itself on top. */}
              <path d={areaPath} fill="var(--color-chart-1)" opacity={0.1} />
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* X labels, thinned out so they never collide on a narrow card. */}
              {points.map((point, index) => {
                const stride = plotWidth < 420 ? 4 : 2;
                if (index % stride !== 0) return null;

                return (
                  <text
                    key={point.date}
                    x={coordinates[index]?.x ?? 0}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                    className="fill-muted text-[11px]"
                  >
                    {point.label}
                  </text>
                );
              })}

              {activeCoordinate ? (
                <g>
                  <line
                    x1={activeCoordinate.x}
                    x2={activeCoordinate.x}
                    y1={PADDING.top}
                    y2={baselineY}
                    stroke="var(--color-chart-grid)"
                    strokeWidth={1}
                  />
                  {/* Surface ring keeps the marker legible over the area wash. */}
                  <circle
                    cx={activeCoordinate.x}
                    cy={activeCoordinate.y}
                    r={5}
                    fill="var(--color-chart-1)"
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                </g>
              ) : null}
            </svg>
          ) : (
            // Height is reserved before the first measurement so the card does
            // not jump when the chart appears.
            <div style={{ height: HEIGHT }} />
          )}

          {activePoint && activeCoordinate ? (
            <div
              // Follows the crosshair, flipping side near the right edge so the
              // readout never runs off the card.
              style={{
                left: activeCoordinate.x,
                top: Math.max(0, activeCoordinate.y - 56),
                transform:
                  activeCoordinate.x > width - 120
                    ? "translateX(-100%)"
                    : "translateX(8px)",
              }}
              className="pointer-events-none absolute rounded-lg border border-line bg-surface px-3 py-2 shadow-sm"
            >
              <p className="text-sm font-semibold text-ink">
                {formatCurrency(activePoint.revenue, appConfig.currencySymbol)}
              </p>
              <p className="mt-0.5 text-xs text-muted">{activePoint.label}</p>
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
