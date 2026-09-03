"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import { productImageUrl } from "@/shared/lib/product-image-url";

import type { PosProduct } from "../types/pos.types";
import { useCurrency } from "@/shared/components/shop-provider";

/**
 * One sellable product.
 *
 * The whole card is the button — on a touch screen a cashier aims at the
 * picture, not at a small "add" control in a corner.
 *
 * A sold-out product stays visible but disabled rather than being filtered out
 * of the grid: a cashier looking for it needs to see that it exists and that
 * there is none, otherwise they assume the search is broken.
 */
export function ProductCard({
  product,
  isAtStockCeiling,
  onSelect,
}: {
  product: PosProduct;
  /** True when the order already holds every unit on hand. */
  isAtStockCeiling: boolean;
  onSelect: (product: PosProduct) => void;
}) {
  const currency = useCurrency();
  const isSoldOut = product.status === "OUT_OF_STOCK" || product.stock <= 0;
  const isLowStock = product.status === "LOW_STOCK" && !isSoldOut;
  const isDisabled = isSoldOut || isAtStockCeiling;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      disabled={isDisabled}
      // The visible text is terse by design, so the accessible name spells out
      // the price and the stock state the badge conveys with colour.
      aria-label={`${product.name}, ${formatCurrency(
        product.unitPrice,
        currency,
      )}, SKU ${product.sku}${
        isSoldOut
          ? ", out of stock"
          : isLowStock
            ? `, low stock, ${product.stock} left`
            : ""
      }`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-surface text-left",
        // `touch-manipulation` drops the browser's double-tap-to-zoom wait, so
        // a tap registers immediately — on a till that delay reads as a
        // dropped scan and the cashier taps again.
        "touch-manipulation select-none transition-[color,background-color,border-color,transform,box-shadow] duration-150",
        isLowStock ? "border-danger" : "border-line",
        isDisabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-brand-500 hover:bg-brand-50/30 hover:shadow-sm active:scale-[0.985] active:bg-brand-50/60",
      )}
    >
      <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-canvas-subtle">
        <ProductImage product={product} />

        {isSoldOut ? (
          <StockBadge label="Out of Stock" />
        ) : isLowStock ? (
          <StockBadge label={`Low Stock: ${product.stock}`} />
        ) : null}
      </div>

      <div className="flex flex-col gap-1 p-3">
        {/* Clamped to two lines so a long name cannot make one card taller
            than its neighbours and ripple through the grid row. */}
        <p className="line-clamp-2 text-sm leading-snug text-ink-soft">
          {product.name}
        </p>
        <p className="text-[1.05rem] font-bold whitespace-nowrap text-ink">
          {formatCurrency(product.unitPrice, currency)}
        </p>
        <p className="text-xs text-muted">SKU: {product.sku}</p>
      </div>
    </button>
  );
}

/** Red corner flag. The label always carries the meaning, never the colour. */
function StockBadge({ label }: { label: string }) {
  return (
    <span className="absolute top-0 right-0 rounded-bl-lg bg-danger px-2 py-1 text-[0.7rem] font-semibold text-white">
      {label}
    </span>
  );
}

/**
 * Product photograph, with a neutral tile when there is none.
 *
 * A real catalogue is never fully photographed, and a broken image on a till is
 * worse than no image: it reads as a system fault to whoever is at the counter.
 * A failed load falls back to the same tile.
 */
function ProductImage({ product }: { product: PosProduct }) {
  const [hasFailed, setHasFailed] = React.useState(false);

  // An uploaded photograph if there is one, the bundled path otherwise.
  const url = productImageUrl(product);

  if (!url || hasFailed) {
    return (
      <span className="flex size-full items-center justify-center text-placeholder">
        <Package aria-hidden className="size-8" />
      </span>
    );
  }

  return (
    <Image
      src={url}
      alt=""
      fill
      // Cards are roughly a quarter of the catalogue column, itself ~60% of the
      // viewport, and never wider than ~260px on a desktop till.
      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 15vw"
      onError={() => setHasFailed(true)}
      className="object-cover"
    />
  );
}
