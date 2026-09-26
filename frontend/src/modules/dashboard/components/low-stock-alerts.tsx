import { PackageCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { routes } from "@/shared/config/app.config";

import type { LowStockItem } from "../types/dashboard.types";

/**
 * Items that have fallen below their reorder level.
 *
 * Uses a real `<table>` rather than a grid of divs: this is tabular data, and
 * the semantics are what let a screen reader announce "Current Stock, 12 bags"
 * instead of reading four unlabelled numbers in a row.
 *
 * <p><b>Nothing low is a result, not an absence.</b> With no items the panel
 * used to draw a row of table headers over empty space beneath a red header,
 * which reads as a panel that failed to load — on the first screen of the
 * portal, in the one state that is actually good news. It now says so in words,
 * and the header drops its red tint: a warning colour with nothing to warn about
 * spends the dashboard's loudest signal on an all-clear, and a shopkeeper who
 * sees red at the top of this panel every morning stops reading it.
 */
export function LowStockAlerts({ items }: { items: LowStockItem[] }) {
  const isClear = items.length === 0;

  return (
    <Card>
      <CardHeader tone={isClear ? "default" : "danger"}>
        <CardTitle className={isClear ? undefined : "text-danger"}>
          {isClear ? (
            <PackageCheck aria-hidden className="size-[18px] text-success" />
          ) : (
            <TriangleAlert aria-hidden className="size-[18px]" />
          )}
          Low Stock Alerts
        </CardTitle>
        <Link
          href={routes.adminInventory}
          className="shrink-0 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          View All
        </Link>
      </CardHeader>

      {isClear ? (
        <EmptyState
          icon={PackageCheck}
          title="Every line is above its reorder level"
          message="Products appear here as soon as their stock falls to the level set against them."
          size="sm"
        />
      ) : (
        <>
          {/*
            Below `sm` the same rows as a compact list. Four columns need about
            544px; a phone has under 300px to give, and sideways-scrolling a
            panel whose entire job is to be glanced at defeats the panel.
          */}
          <ul className="divide-y divide-line sm:hidden">
            {items.map(({ id, name, sku, currentStock, reorderLevel, unit, icon: Icon }) => (
              <li key={id} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas-subtle text-ink-soft"
                >
                  <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words text-ink">{name}</p>
                  <p className="mt-0.5 text-xs text-muted">{sku}</p>
                </div>

                {/* Both figures together, because the alert is the relationship
                    between them rather than either number on its own. */}
                <p className="shrink-0 text-right text-sm whitespace-nowrap">
                  <span className="font-semibold text-danger">
                    {currentStock} {unit}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    of {reorderLevel} {unit}
                  </span>
                </p>
              </li>
            ))}
          </ul>

          {/* From `sm`, the table. The SKU waits for `lg`, where the panel is
              beside the quick-add form and has the width for a fourth column. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <thead>
                <tr className="bg-canvas-subtle text-left text-xs text-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Item Name
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">
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
                    <td className="hidden px-3 py-3 whitespace-nowrap text-muted lg:table-cell">
                      {sku}
                    </td>
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
        </>
      )}
    </Card>
  );
}
