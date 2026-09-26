"use client";

import { Loader2, RotateCw, SearchX } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

import type { PosProduct } from "../types/pos.types";

import { ProductCard } from "./product-card";

/**
 * The catalogue grid: one page of products, with more loaded as it scrolls.
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
 *
 * PAGING
 *
 * The next page is requested while the cashier is still a few rows from the
 * end, by watching an invisible marker below the last card, so scrolling rarely
 * has to wait. A visible "Load more" button does the same for a keyboard, and
 * for any browser where the marker is never seen.
 */
export function ProductGrid({
  products,
  isAtStockCeiling,
  onSelect,
  hasMore,
  isSearching,
  isLoadingMore,
  isAtBrowseLimit,
  error,
  onLoadMore,
  onRetry,
  scrollRoot,
}: {
  products: PosProduct[];
  isAtStockCeiling: (productId: string) => boolean;
  onSelect: (product: PosProduct) => void;
  hasMore: boolean;
  /** A new search is loading; the current results stay up, dimmed. */
  isSearching: boolean;
  isLoadingMore: boolean;
  isAtBrowseLimit: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
  /** The element the grid scrolls inside, so paging can start before the end. */
  scrollRoot: React.RefObject<HTMLElement | null>;
}) {
  const sentinel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const marker = sentinel.current;
    if (!marker || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      // About two screens of cards ahead of the end.
      { root: scrollRoot.current, rootMargin: "0px 0px 800px 0px" },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, scrollRoot, products.length]);

  if (products.length === 0) {
    if (isSearching) {
      return (
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Searching the catalogue…
        </div>
      );
    }
    if (error) return <LoadError message={error} onRetry={onRetry} />;

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
    <div>
      <div
        // `aria-live` keeps a screen-reader user informed as the grid narrows
        // under a search that they cannot see re-render.
        aria-live="polite"
        aria-busy={isSearching}
        className={cn(
          "grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]",
          // The previous results stay while the next load, dimmed so it is clear
          // they are about to change — instead of the grid blanking per keystroke.
          "transition-opacity duration-150",
          isSearching && "opacity-60",
        )}
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

      <div ref={sentinel} aria-hidden className="h-px" />

      {error ? (
        <LoadError message={error} onRetry={onRetry} />
      ) : hasMore ? (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas-subtle disabled:opacity-70"
          >
            {isLoadingMore ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : isAtBrowseLimit ? (
        <p className="pt-4 text-center text-sm text-muted">
          Showing the first {products.length} products. Search, or pick a
          category, to find the rest.
        </p>
      ) : null}
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-danger">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas-subtle"
      >
        <RotateCw aria-hidden className="size-4" />
        Try again
      </button>
    </div>
  );
}
