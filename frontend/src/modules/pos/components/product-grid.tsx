"use client";

import { SearchX } from "lucide-react";

import type { PosProduct } from "../types/pos.types";

import { ProductCard } from "./product-card";

/**
 * The sellable catalogue, filtered by the search box and category chips.
 *
 * The column count is driven by the space available, not by the viewport.
 * `auto-fill` with a `minmax` track means the grid fits as many cards of at
 * least the minimum width as it can and shares the remainder between them —
 * which is the only thing that works here, because the catalogue's width
 * depends on how much the order panel beside it is taking. Viewport
 * breakpoints cannot see that, and got it wrong at both ends: 282px cards at
 * 600px wide, and still only four columns on a 1920px screen.
 *
 * The minimum steps up once past `sm`, so a 320px phone still gets two columns
 * per row rather than one very wide card. 10rem is the smaller of the two
 * because a 160px card is still a comfortable touch target, and holding the
 * minimum any higher left 250px cards sitting two-to-a-row on a 900px tablet.
 *
 * Rows are sized to their content (`auto-rows-min`) rather than stretched to
 * fill the column: with a short result set, stretched cards would leave one row
 * of very tall tiles, and a cashier scans this grid by shape as much as by
 * text.
 */
export function ProductGrid({
  products,
  isAtStockCeiling,
  onSelect,
}: {
  products: PosProduct[];
  isAtStockCeiling: (productId: string) => boolean;
  onSelect: (product: PosProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-canvas-subtle text-muted"
        >
          <SearchX className="size-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">No products found</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Check the spelling, or clear the category filter to search the whole
          catalogue.
        </p>
      </div>
    );
  }

  return (
    <div
      // `aria-live` keeps a screen-reader user informed as the grid narrows
      // under a search that they cannot see re-render.
      aria-live="polite"
      className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3
                 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]"
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isAtStockCeiling={isAtStockCeiling(product.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
