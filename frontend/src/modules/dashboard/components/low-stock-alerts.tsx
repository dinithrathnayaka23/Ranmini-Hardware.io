import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { routes } from "@/shared/config/app.config";

import type { LowStockItem } from "../types/dashboard.types";

/**
 * Items that have fallen below their reorder level.
 *
 * Uses a real `<table>` rather than a grid of divs: this is tabular data, and
 * the semantics are what let a screen reader announce "Current Stock, 12 bags"
 * instead of reading four unlabelled numbers in a row.
 */
export function LowStockAlerts({ items }: { items: LowStockItem[] }) {
  return (
    <Card>
      <CardHeader tone="danger">
        <CardTitle className="text-danger">
          <TriangleAlert aria-hidden className="size-[18px]" />
          Low Stock Alerts
        </CardTitle>
        <Link
          href={routes.adminInventory}
          className="shrink-0 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          View All
        </Link>
      </CardHeader>

      {/* Narrow screens scroll the table sideways rather than crushing the
          columns — the page itself must never scroll horizontally. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="bg-canvas-subtle text-left text-xs text-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">
                Item Name
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                SKU
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Current Stock
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Reorder Lvl
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map(({ id, name, sku, currentStock, reorderLevel, unit, icon: Icon }) => (
              <tr key={id} className="border-t border-line">
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas-subtle text-ink-soft"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-ink">{name}</span>
                  </span>
                </th>
                <td className="px-3 py-3 whitespace-nowrap text-muted">{sku}</td>
                {/* Red and bold: the whole point of the panel is that this
                    number is below the one beside it. */}
                <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-danger">
                  {currentStock} {unit}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap text-muted">
                  {reorderLevel} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
