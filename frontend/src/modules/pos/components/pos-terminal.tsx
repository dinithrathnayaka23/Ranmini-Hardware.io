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
 * HEIGHT STRATEGY
 *
 * From `lg` the terminal is pinned to exactly one viewport (`h-dvh`) and the
 * page itself never scrolls. Only two regions scroll internally — the product
 * grid and the list of order lines — so the search box, the category chips, the
 * total and the pay button all stay exactly where the cashier left them. On a
 * counter machine that fixity is the whole point: hunting for a moved button
 * with a customer waiting is what slows a queue down.
 *
 * Below `lg` the height is a *minimum*, not a cap. A phone keyboard covers half
 * the screen, and the order panel becomes an overlay reached from a summary bar
 * pinned to the bottom, rather than a second column there is no width for.
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
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelectProduct = (product: PosProduct) => {
    addToCart(product);
    // Keep the keyboard pointed at the search box so the next scan still lands
    // somewhere useful after a tap on a card.
    searchRef.current?.focus();
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden lg:h-dvh">
      <PosTopbar terminalName={terminalName} cashierName={cashierName} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ---------------------------- Catalogue ---------------------------- */}
        <section
          aria-label="Product catalogue"
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <div className="shrink-0 space-y-3 border-b border-line bg-canvas-subtle p-3 sm:p-4">
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

          {/* The only scrolling region on the left. The extra bottom padding
              below `lg` keeps the last row clear of the fixed order bar. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24 sm:p-4 lg:pb-4">
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
          className={cn(
            // Below lg the panel is a full-screen overlay toggled by the bar at
            // the bottom; from lg it is simply the second column.
            "fixed inset-0 z-40 lg:static lg:z-auto lg:block",
            "lg:w-104 lg:shrink-0 lg:border-l lg:border-line xl:w-120",
            isOrderOpen ? "block" : "hidden",
          )}
        >
          <OrderPanel
            cart={cart}
            tender={tender}
            onTenderChange={setTender}
            onPay={() => setHasRequestedPayment(true)}
            onClose={() => setIsOrderOpen(false)}
          />
        </section>
      </div>

      {/* Order summary bar — small screens only, where the panel is hidden. */}
      <button
        type="button"
        onClick={() => setIsOrderOpen(true)}
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-between gap-4 border-t border-line bg-surface px-4 text-left lg:hidden"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <ShoppingCart aria-hidden className="size-5 text-brand-600" />
          {cart.totals.itemCount === 1
            ? "1 item"
            : `${cart.totals.itemCount} items`}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-base font-bold whitespace-nowrap text-brand-600">
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
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto w-[min(28rem,calc(100%-2rem))] lg:bottom-6">
      <Alert
        tone="info"
        message="Payment is not connected yet — the sales endpoint is still to be built, so nothing has been charged and the order is untouched."
      />
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 w-full rounded-lg border border-line bg-surface py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas-subtle"
      >
        Dismiss
      </button>
    </div>
  );
}
