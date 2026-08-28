"use client";

import { ShoppingCart } from "lucide-react";
import * as React from "react";

import { Alert } from "@/shared/components/ui/alert";
import { appConfig } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";

import { ALL_CATEGORIES } from "../constants/pos-data";
import { useCart } from "../lib/use-cart";
import type { PosCategory, PosProduct, TenderMethod } from "../types/pos.types";

import { CategoryFilter } from "./category-filter";
import { OrderPanel } from "./order-panel";
import { PosTopbar } from "./pos-topbar";
import { ProductGrid } from "./product-grid";
import { ProductSearch } from "./product-search";

/**
 * The whole till: catalogue on the left, the order being built on the right.
 *
 * LAYOUT
 *
 * The two-column layout starts at `md` (768px), not `lg`. A tablet held in
 * portrait is the likeliest thing this actually runs on, and 768px is exactly
 * an iPad — hiding the order behind an overlay on the very device the shop is
 * most likely to buy was the wrong trade.
 *
 * The panel's width is a clamp rather than a set of breakpoint widths:
 * `clamp(20rem, 40%, 32rem)` keeps it at the design's 40% share through the
 * middle of the range, never squeezes below 320px on a small tablet, and stops
 * growing past 512px on a wide monitor — where the extra room is far better
 * spent on more product cards than on a wider total.
 *
 * Everything inside the panel then sizes itself against the panel's own width
 * with container queries, because the same viewport can hand it very different
 * widths depending on the window.
 *
 * HEIGHT
 *
 * The shell pins itself to exactly one viewport so the page never scrolls and
 * the pay button never moves — but only where there is room, which is the
 * `[data-pos-shell]` rule in `globals.css`. Only the product grid and the order
 * lines scroll, inside themselves. On a counter machine that fixity is the
 * point: hunting for a shifted button with a customer waiting is what slows a
 * queue down.
 *
 * Below `md` the height is a minimum, not a cap — a phone keyboard takes half
 * the screen — and the order panel becomes a sheet reached from a summary bar
 * pinned to the bottom.
 */
export function PosTerminal({
  products,
  categories,
  terminalName,
  cashierName,
}: {
  products: PosProduct[];
  categories: PosCategory[];
  terminalName: string;
  cashierName: string;
}) {
  const cart = useCart();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const closeOrderRef = React.useRef<HTMLButtonElement>(null);
  const openOrderRef = React.useRef<HTMLButtonElement>(null);

  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(ALL_CATEGORIES);
  const [tender, setTender] = React.useState<TenderMethod>("CASH");
  const [isOrderOpen, setIsOrderOpen] = React.useState(false);
  const [hasRequestedPayment, setHasRequestedPayment] = React.useState(false);

  const visibleProducts = React.useMemo(
    () => filterProducts(products, categoryId, query),
    [products, categoryId, query],
  );

  const { add: addToCart } = cart;

  /**
   * What Enter in the search box does.
   *
   * A barcode scanner types a SKU and presses Enter, so an exact SKU match is
   * added straight away. Failing that, a search narrowed to a single product is
   * treated the same way — it is unambiguous, and it saves a tap. Anything
   * broader is left alone rather than guessing which product was meant.
   */
  const handleSearchSubmit = React.useCallback(() => {
    const term = query.trim().toLowerCase();
    if (term === "") return;

    const match =
      products.find((product) => product.sku.toLowerCase() === term) ??
      (visibleProducts.length === 1 ? visibleProducts[0] : undefined);

    if (!match || match.stock <= 0) return;

    addToCart(match);
    setQuery("");
  }, [addToCart, products, query, visibleProducts]);

  // Hotkeys taken from the design's own labels: F2 returns to the search box
  // from anywhere, F9 selects cash. Both are captured on the window because a
  // cashier's focus is usually in the grid or the order list, not the field.
  // Escape closes the order sheet, which is the convention every other overlay
  // on the web follows and the first thing a keyboard user tries.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "F9") {
        event.preventDefault();
        setTender("CASH");
      }
      if (event.key === "Escape" && isOrderOpen) {
        event.preventDefault();
        setIsOrderOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOrderOpen]);

  // While the sheet is up it covers the whole screen, so letting the page
  // scroll underneath it just moves the grid about behind the cashier's back.
  React.useEffect(() => {
    if (!isOrderOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOrderOpen]);

  // Move focus into the sheet when it opens and back to the bar that opened it
  // when it closes, so keyboard focus never ends up stranded behind an overlay.
  const wasOrderOpen = React.useRef(false);
  React.useEffect(() => {
    if (isOrderOpen) closeOrderRef.current?.focus();
    else if (wasOrderOpen.current) openOrderRef.current?.focus();
    wasOrderOpen.current = isOrderOpen;
  }, [isOrderOpen]);

  const handleSelectProduct = (product: PosProduct) => {
    addToCart(product);
    // Keep the keyboard pointed at the search box so the next scan still lands
    // somewhere useful after a tap on a card.
    searchRef.current?.focus();
  };

  return (
    <div data-pos-shell className="flex min-h-dvh flex-col overflow-hidden">
      <PosTopbar terminalName={terminalName} cashierName={cashierName} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ---------------------------- Catalogue ---------------------------- */}
        <section
          aria-label="Product catalogue"
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <div className="shrink-0 border-b border-line bg-canvas-subtle p-3 sm:p-4">
            {/* Capped so the search field does not stretch to 1400px on a wide
                monitor, where a single very long empty box reads as a mistake.
                The cap is above every realistic till width, so it changes
                nothing at or below 1280px. */}
            <div className="max-w-5xl space-y-3">
              <ProductSearch
                ref={searchRef}
                value={query}
                onValueChange={setQuery}
                onSubmit={handleSearchSubmit}
              />
              <CategoryFilter
                categories={categories}
                activeId={categoryId}
                onSelect={setCategoryId}
              />
            </div>
          </div>

          {/* The only scrolling region on the left. `overscroll-contain` stops a
              flick at the end of the grid from dragging the whole page on a
              touch screen. The extra bottom padding below `md` clears the fixed
              order bar, including the home indicator on a modern phone. */}
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4">
            <ProductGrid
              products={visibleProducts}
              isAtStockCeiling={cart.isAtStockCeiling}
              onSelect={handleSelectProduct}
            />
          </div>
        </section>

        {/* -------------------------- Current order -------------------------- */}
        <section
          aria-label="Current order"
          // Below md it is a sheet over the grid, so it is announced as a
          // dialog; from md it is simply the second column and the role would
          // be a lie.
          role={isOrderOpen ? "dialog" : undefined}
          aria-modal={isOrderOpen ? true : undefined}
          className={cn(
            "fixed inset-0 z-40 md:static md:z-auto md:block",
            "md:w-[clamp(20rem,40%,32rem)] md:shrink-0 md:border-l md:border-line",
            isOrderOpen
              ? "block animate-[pos-sheet-in_180ms_ease-out] md:animate-none"
              : "hidden",
          )}
        >
          <OrderPanel
            cart={cart}
            tender={tender}
            onTenderChange={setTender}
            onPay={() => setHasRequestedPayment(true)}
            onClose={() => setIsOrderOpen(false)}
            closeRef={closeOrderRef}
          />
        </section>
      </div>

      {/* Order summary bar — small screens only, where the panel is a sheet. */}
      <button
        ref={openOrderRef}
        type="button"
        onClick={() => setIsOrderOpen(true)}
        aria-expanded={isOrderOpen}
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 touch-manipulation items-center justify-between gap-4 border-t border-line bg-surface px-4 pb-[env(safe-area-inset-bottom)] text-left transition-colors duration-150 active:bg-canvas-subtle md:hidden"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <ShoppingCart aria-hidden className="size-5 text-brand-600" />
          {cart.totals.itemCount === 1
            ? "1 item"
            : `${cart.totals.itemCount} items`}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-base font-bold whitespace-nowrap text-brand-600 tabular-nums">
            {formatCurrency(cart.totals.total, appConfig.currencySymbol)}
          </span>
          <span className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
            View order
          </span>
        </span>
      </button>

      {hasRequestedPayment ? (
        <PaymentNotice onDismiss={() => setHasRequestedPayment(false)} />
      ) : null}
    </div>
  );
}

/**
 * Filters the catalogue by category and free text.
 *
 * SKU is matched as well as name because that is what a scanner sends and what
 * a cashier reads off a shelf label.
 */
function filterProducts(
  products: PosProduct[],
  categoryId: string,
  query: string,
): PosProduct[] {
  const term = query.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory =
      categoryId === ALL_CATEGORIES || product.categoryId === categoryId;

    const matchesTerm =
      term === "" ||
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term);

    return matchesCategory && matchesTerm;
  });
}

/**
 * Shown when the cashier commits a sale.
 *
 * The order is deliberately NOT cleared and no receipt is claimed: there is no
 * sales endpoint yet, and a till that appears to take money it has not recorded
 * is the most damaging thing this screen could pretend to do. Replace this with
 * the real `POST /api/v1/pos/sales` call and the receipt hand-off.
 */
function PaymentNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-[min(28rem,calc(100%-2rem))] md:bottom-6">
      <Alert
        tone="info"
        className="shadow-lg"
        message="Payment is not connected yet — the sales endpoint is still to be built, so nothing has been charged and the order is untouched."
      />
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 w-full rounded-lg border border-line bg-surface py-2 text-sm font-medium text-ink-soft shadow-sm transition-colors duration-150 hover:bg-canvas-subtle"
      >
        Dismiss
      </button>
    </div>
  );
}
