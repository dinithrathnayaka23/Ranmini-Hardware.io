"use client";

import { SearchX } from "lucide-react";

import type { PosProduct } from "../types/pos.types";

import { ProductCard } from "./product-card";

/**
 * The sellable catalogue, filtered by the search box and category chips.
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
      className="grid auto-rows-min grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
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
