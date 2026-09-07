"use client";

import { CircleAlert, CircleCheck, Info, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert } from "@/shared/components/ui/alert";
import { PrintReceiptPortal } from "@/shared/components/receipt/print-receipt-portal";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";

import { completeSale } from "../actions";
import { ALL_CATEGORIES } from "../constants/pos-data";
import { parseTendered } from "../lib/cash";
import { useCart } from "../lib/use-cart";
import type {
  CompletedSale,
  PosCategory,
  PosProduct,
  TenderMethod,
} from "../types/pos.types";

import { CategoryFilter } from "./category-filter";
import { PaymentConfirmation } from "./payment-confirmation";
import { OrderPanel } from "./order-panel";
import { PosTopbar } from "./pos-topbar";
import { ProductGrid } from "./product-grid";
import { ProductSearch } from "./product-search";
import { useCurrency, useTaxRate } from "@/shared/components/shop-provider";

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
/** What the last search did, and how loudly to say it. */
interface SearchNotice {
  tone: "success" | "danger" | "info";
  message: string;
}

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
  const taxRate = useTaxRate();
  const cart = useCart(taxRate);
  const currency = useCurrency();
  const router = useRouter();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const closeOrderRef = React.useRef<HTMLButtonElement>(null);
  const openOrderRef = React.useRef<HTMLButtonElement>(null);

  const [query, setQuery] = React.useState("");
  /**
   * What the last search did, shown above the grid.
   *
   * Held as an object rather than a string so replacing one notice with an
   * identical one still re-triggers the dismissal timer — pressing Enter twice
   * on the same unlisted product should look like two failed lookups, not one.
   */
  const [notice, setNotice] = React.useState<SearchNotice | null>(null);
  const [categoryId, setCategoryId] = React.useState(ALL_CATEGORIES);
  const [tender, setTender] = React.useState<TenderMethod>("CASH");
  /**
   * Cash the customer handed over, as typed.
   *
   * Text rather than a number so an empty box stays empty — that is a real
   * answer here, meaning the customer paid the exact amount, and a zero would
   * instead claim they paid nothing.
   */
  const [cashTendered, setCashTendered] = React.useState("");
  const [isOrderOpen, setIsOrderOpen] = React.useState(false);
  const [isPaying, setIsPaying] = React.useState(false);
  const [completed, setCompleted] = React.useState<CompletedSale | null>(null);
  /**
   * Whether the receipt for {@link completed} is on its way to the printer.
   *
   * Separate from the sale itself because the two end at different moments: the
   * print dialog closes long before the cashier dismisses the banner, and the
   * banner keeps a "Print again" button for the copy that jammed.
   */
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);

  /**
   * Identifies this basket to the backend across retries.
   *
   * Created on the first attempt and kept until the sale succeeds, so a cashier
   * pressing pay again after a network timeout gets the original sale back
   * rather than charging the customer twice. Cleared on success, so the next
   * basket is genuinely a new sale.
   */
  const idempotencyKey = React.useRef<string | null>(null);

  const visibleProducts = React.useMemo(
    () => filterProducts(products, categoryId, query),
    [products, categoryId, query],
  );

  const { add: addToCart } = cart;

  /**
   * What Enter in the search box does.
   *
   * <p>An exact code match is added straight away, so a cashier who knows the
   * shelf code can type it and carry on. Failing that, a search narrowed to a
   * single product is treated the same way — it is unambiguous, and it saves a
   * tap. Anything broader is left showing in the grid rather than guessing
   * which product was meant.
   *
   * <p><b>Every outcome says something.</b> This used to return silently when
   * the text matched nothing or matched something sold out, leaving the cashier
   * pressing Enter at a field that appeared to be ignoring them.
   *
   * <p>What happens to the text afterwards depends on why. A product that was
   * added, or that cannot be, is finished with, so the box is cleared for the
   * next one. Text that simply matched nothing is kept: it is almost always a
   * misspelling, and correcting three letters is far quicker than typing the
   * whole word again.
   */
  const handleSearchSubmit = React.useCallback(() => {
    const term = query.trim().toLowerCase();
    if (term === "") return;

    const match =
      products.find((product) => product.sku.toLowerCase() === term) ??
      (visibleProducts.length === 1 ? visibleProducts[0] : undefined);

    if (!match) {
      // Several matches is not a failure — the grid is now showing exactly
      // those products, which is the useful state. The term stays so the filter
      // holds while the cashier picks one.
      if (visibleProducts.length > 1) {
        setNotice({
          tone: "info",
          message: `${visibleProducts.length} products match "${query.trim()}" — tap the one you want.`,
        });
        return;
      }

      setNotice({
        tone: "danger",
        message: `Nothing in the catalogue matches "${query.trim()}".`,
      });
      return;
    }

    if (match.stock <= 0) {
      setNotice({ tone: "danger", message: `${match.name} is out of stock.` });
      setQuery("");
      return;
    }

    if (cart.isAtStockCeiling(match.id)) {
      setNotice({
        tone: "danger",
        message: `All ${match.stock} ${match.name} in stock are already on this order.`,
      });
      setQuery("");
      return;
    }

    addToCart(match);
    // Confirmed by name, not just by the line appearing in the panel — below
    // `md` the order panel is a sheet that is not even open.
    setNotice({ tone: "success", message: `Added ${match.name}.` });
    setQuery("");
  }, [addToCart, cart, products, query, visibleProducts]);

  // The notice describes one action, so it clears itself rather than sitting
  // there describing an item three customers ago. Re-armed on every notice,
  // including one that replaces another.
  React.useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * The latest pay handler, for the F10 shortcut.
   *
   * <p>A ref rather than a dependency of the key listener: `handlePay` closes
   * over the basket and is therefore a new function on every keystroke, and
   * tearing the window listener down and rebuilding it that often risks
   * dropping a keystroke while the cashier is mid-search.
   */
  const payRef = React.useRef<() => void>(() => {});

  /**
   * Whether the confirmation screen is up, for the key listener below.
   *
   * <p>A ref for the same reason `payRef` is one: the listener is registered
   * once and must not be rebuilt every time the basket changes.
   */
  const completedRef = React.useRef(false);
  completedRef.current = completed !== null;

  // Hotkeys, so a full sale can be rung up without leaving the keyboard: F2
  // returns to the search box from anywhere, F9 selects cash, F10 takes the
  // payment. They are captured on the window because a cashier's focus is
  // usually in the grid or the order list, not the field. Escape closes the
  // order sheet, which is the convention every other overlay on the web
  // follows and the first thing a keyboard user tries.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // The confirmation screen is modal and owns the keyboard while it is up.
      // Without this, F2 would pull focus to a search box behind the overlay
      // and the cashier would be typing somewhere they cannot see.
      if (completedRef.current) return;

      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "F9") {
        event.preventDefault();
        setTender("CASH");
      }
      if (event.key === "F10") {
        // Prevented because Firefox opens its menu bar on F10, which would
        // steal focus from the till mid-sale. The handler itself refuses an
        // empty basket and a sale already in flight, exactly as the button does.
        event.preventDefault();
        payRef.current();
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

  /**
   * Switching between cash and card.
   *
   * Moving to card discards whatever was typed into the cash box: a card is
   * charged the exact amount, and carrying "5,000 received" across would print
   * a receipt claiming change was given on a card payment.
   */
  const handleTenderChange = React.useCallback((next: TenderMethod) => {
    setTender(next);
    if (next !== "CASH") setCashTendered("");
  }, []);

  const handlePay = async () => {
    if (cart.isEmpty || isPaying) return;

    setIsPaying(true);
    setPayError(null);

    idempotencyKey.current ??= crypto.randomUUID();

    const result = await completeSale({
      // Only ids and quantities travel. Every amount is recomputed by the
      // backend, because a total posted by a browser is one a customer can edit.
      lines: cart.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
      discountPercent: cart.discountPercent,
      tender,
      // Omitted when the box is empty, which the backend reads as the customer
      // paying the exact amount rather than as a tender of nothing.
      amountTendered:
        tender === "CASH" ? (parseTendered(cashTendered) ?? undefined) : undefined,
      terminalName,
      idempotencyKey: idempotencyKey.current,
    });

    setIsPaying(false);

    if (!result.success) {
      setPayError(result.message);
      return;
    }

    setCompleted(result.sale);
    // The button says "Pay & Print Receipt", so it prints. A till that took the
    // money and then waited to be asked for the receipt would be lying about
    // what the control does — and the cashier would notice one customer later.
    setIsPrinting(true);
    cart.clear();
    setCashTendered("");
    idempotencyKey.current = null;
    setIsOrderOpen(false);

    /*
     * Back to the search box, ready for the next customer.
     *
     * Focus was on the pay button, which the empty basket has just disabled —
     * so the first thing typed for the next customer went nowhere at all, and
     * the cashier had to tap the field before the till would take anything. The
     * search box is autofocused on load because typing is how products are
     * found here, and that has to hold for the second sale as much as the
     * first.
     *
     * Done here as well as after printing, because the receipt may not print —
     * a cancelled dialog, no printer — and the till must be ready regardless.
     */
    searchRef.current?.focus();

    // The catalogue on screen still shows the stock this sale just took.
    router.refresh();
  };

  // Kept current for the F10 listener above, which deliberately does not take
  // it as a dependency.
  React.useEffect(() => {
    payRef.current = handlePay;
  });

  /**
   * Leaving the confirmation screen, ready for the next customer.
   *
   * <p>Focus goes back to the search box rather than being left on a button
   * that has just been unmounted — otherwise the next thing typed lands on the
   * document body and is lost.
   */
  const handleNextSale = React.useCallback(() => {
    setCompleted(null);
    searchRef.current?.focus();
  }, []);

  const handlePrinted = React.useCallback(() => {
    setIsPrinting(false);
    // The print dialog took focus; hand it back to the search box so the next
    // customer's first keystroke lands somewhere.
    searchRef.current?.focus();
  }, []);

  // Typing is the cashier moving on, so the previous message goes with them
  // rather than hanging over a search they have already corrected.
  const handleQueryChange = React.useCallback((value: string) => {
    setQuery(value);
    setNotice(null);
  }, []);

  const handleSelectProduct = (product: PosProduct) => {
    addToCart(product);
    // Keep the keyboard pointed at the search box, so typing still works after
    // a tap on a card.
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
                onValueChange={handleQueryChange}
                onSubmit={handleSearchSubmit}
              />
              <CategoryFilter
                categories={categories}
                activeId={categoryId}
                onSelect={setCategoryId}
              />

              <SearchStatusBar notice={notice} />
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
            onTenderChange={handleTenderChange}
            onPay={handlePay}
            isPaying={isPaying}
            cashTendered={cashTendered}
            onCashTenderedChange={setCashTendered}
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
            {formatCurrency(cart.totals.total, currency)}
          </span>
          <span className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
            View order
          </span>
        </span>
      </button>

      {payError ? (
        <PaymentFailed message={payError} onDismiss={() => setPayError(null)} />
      ) : null}

      {completed ? (
        <PaymentConfirmation sale={completed} onDone={handleNextSale} />
      ) : null}

      {completed && isPrinting ? (
        <PrintReceiptPortal sale={completed} onDone={handlePrinted} />
      ) : null}
    </div>
  );
}

/**
 * One line under the search box saying what the last search did.
 *
 * <p><b>Always present, even with nothing to report.</b> A strip that appeared
 * and vanished would push the product grid down and let it spring back on
 * every lookup, and a cashier taps cards in that grid — a tile that moves 40px
 * under a finger already on its way down is a mis-tap and a wrong item on the
 * bill. Holding the row open costs one line of the catalogue once, rather than
 * moving the whole thing dozens of times an hour.
 *
 * <p>Idle, it earns its place by naming the keyboard shortcuts. They were only
 * ever discoverable from two hints in placeholder text, so a cashier who had
 * not been shown them never found F9 at all.
 *
 * <p>`role="status"` rather than an alert: a screen-reader user wants to hear
 * "Added Cement 50kg" between lookups, not to have the order interrupted by it.
 */
function SearchStatusBar({ notice }: { notice: SearchNotice | null }) {
  const Icon = notice
    ? notice.tone === "success"
      ? CircleCheck
      : notice.tone === "danger"
        ? CircleAlert
        : Info
    : null;

  return (
    <div
      role="status"
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150",
        notice === null
          ? "text-muted"
          : notice.tone === "success"
            ? "bg-success-soft text-success"
            : notice.tone === "danger"
              ? "bg-danger-soft text-danger"
              : "bg-brand-50 text-brand-800",
      )}
    >
      {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}

      {notice ? (
        <span className="min-w-0 flex-1 truncate">{notice.message}</span>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3 truncate text-xs font-normal">
          <Shortcut keyLabel="F2">Search</Shortcut>
          <Shortcut keyLabel="F9">Cash</Shortcut>
          <Shortcut keyLabel="F10">Pay</Shortcut>
          <span className="hidden sm:inline">
            Search by name or code, or tap a product to add it.
          </span>
        </span>
      )}
    </div>
  );
}

/** One keyboard shortcut in the idle status bar. */
function Shortcut({
  keyLabel,
  children,
}: {
  keyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[0.7rem] font-medium text-ink-soft">
        {keyLabel}
      </kbd>
      {children}
    </span>
  );
}

/**
 * Filters the catalogue by category and free text.
 *
 * The code is matched as well as the name, because a shelf label is often
 * quicker to read than a product name is to spell.
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
 * A refused sale.
 *
 * <p>An ordinary event at a counter — the last bag of cement went to the other
 * till — so it renders as a message the cashier can act on rather than a
 * crashed page with a customer waiting. Dismissed by hand: the basket is still
 * on screen and still theirs to fix.
 */
function PaymentFailed({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-[min(28rem,calc(100%-2rem))] md:bottom-6">
      <Alert tone="danger" className="shadow-lg" message={message} />

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
