"use client";

import * as React from "react";

import { routes } from "@/shared/config/app.config";

import { ALL_CATEGORIES, MAX_BROWSE_ITEMS } from "../constants/pos-data";
import type { CataloguePage, PosProduct } from "../types/pos.types";

/**
 * How long typing must pause before a search is sent.
 *
 * <p>Short enough that results keep up with a cashier's typing, long enough
 * that "portland" is one request rather than eight.
 */
const SEARCH_DEBOUNCE_MS = 180;

/**
 * How long a remembered result stays good.
 *
 * <p>Results carry stock levels, which every sale at every till changes, so they
 * are kept only long enough to make backspacing and flicking between categories
 * instant — not long enough to show a shelf count from before the last rush.
 */
const RESULT_TTL_MS = 30_000;

/** How many recent searches are remembered. */
const MAX_REMEMBERED = 40;

interface Remembered {
  items: PosProduct[];
  hasMore: boolean;
  page: number;
  at: number;
}

interface View {
  /** Which search and category these results belong to. */
  key: string;
  items: PosProduct[];
  hasMore: boolean;
  page: number;
}

export interface Catalogue {
  items: PosProduct[];
  hasMore: boolean;
  /** A new search or category is on its way; the grid keeps showing the last one. */
  isSearching: boolean;
  isLoadingMore: boolean;
  /** Scrolled as far as the browsing cap allows; the rest is reached by searching. */
  isAtBrowseLimit: boolean;
  error: string | null;
  loadMore: () => void;
  /** Re-reads what is on screen, for fresh stock after a sale. */
  refresh: () => void;
  /** The results for the search as currently typed, waiting for them if need be. */
  resolveCurrent: () => Promise<{ items: PosProduct[]; hasMore: boolean }>;
  /** One sellable product by its exact shelf code, or null. */
  findBySku: (sku: string) => Promise<PosProduct | null>;
}

/**
 * The till's catalogue, searched on the server as the cashier types.
 *
 * <p><b>Why this exists.</b> The till used to load one page of products and
 * filter it in the browser. With a real catalogue that meant only the first
 * hundred products by name could ever be found; everything else answered "no
 * match" however it was spelled. Every search and category now asks the
 * backend, which searches the whole catalogue through an index.
 *
 * <p><b>What keeps it quick.</b>
 * <ul>
 *   <li>Typing is debounced, and a search overtaken by the next keystroke is
 *       cancelled, so a slow answer to "por" can never land on top of the
 *       answer to "portland".</li>
 *   <li>Recent results are remembered briefly, so backspacing to a search
 *       already made, or flicking back to a category, shows it at once.</li>
 *   <li>The previous results stay on screen while the next ones load, rather
 *       than the grid blanking on every keystroke.</li>
 *   <li>Further pages load as the grid is scrolled, up to a cap, so the page
 *       can never accumulate the whole catalogue.</li>
 * </ul>
 */
export function useCatalogue({
  initial,
  query,
  categoryId,
}: {
  /** The first page, rendered with the page for an instant first paint. */
  initial: CataloguePage;
  query: string;
  categoryId: string;
}): Catalogue {
  const normalised = normaliseQuery(query);
  const currentKey = keyOf(normalised, categoryId);

  const remembered = React.useRef(new Map<string, Remembered>());
  const inFlight = React.useRef<{ key: string; controller: AbortController; promise: Promise<View | null> } | null>(null);

  const initialKey = keyOf("", ALL_CATEGORIES);
  const [view, setView] = React.useState<View>({
    key: initialKey,
    items: initial.items,
    hasMore: initial.hasMore,
    page: 1,
  });
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The server-rendered first page is the first thing remembered.
  React.useEffect(() => {
    remember(remembered.current, initialKey, {
      items: initial.items,
      hasMore: initial.hasMore,
      page: 1,
    });
  }, [initial, initialKey]);

  /** Fetches the first page for a key, cancelling whatever it overtakes. */
  const startSearch = React.useCallback(
    (key: string, search: string, category: string): Promise<View | null> => {
      inFlight.current?.controller.abort();
      const controller = new AbortController();

      const promise = fetchPage({ query: search, categoryId: category, page: 1 }, controller.signal)
        .then((page) => {
          const next: View = { key, items: page.items, hasMore: page.hasMore, page: 1 };
          remember(remembered.current, key, next);
          if (inFlight.current?.controller === controller) {
            setView(next);
            setIsSearching(false);
            setError(null);
            inFlight.current = null;
          }
          return next;
        })
        .catch((cause: unknown) => {
          if (isAbort(cause)) return null;
          if (inFlight.current?.controller === controller) {
            setIsSearching(false);
            setError(messageFor(cause));
            inFlight.current = null;
          }
          return null;
        });

      inFlight.current = { key, controller, promise };
      setIsSearching(true);
      return promise;
    },
    [],
  );

  // A new search or category: shown at once if remembered, fetched otherwise.
  React.useEffect(() => {
    if (view.key === currentKey && !inFlight.current) return;

    const cached = recall(remembered.current, currentKey);
    if (cached) {
      inFlight.current?.controller.abort();
      inFlight.current = null;
      setView({ key: currentKey, ...cached });
      setIsSearching(false);
      setError(null);
      return;
    }

    // Choosing a category, or clearing the box, is a deliberate single action
    // and goes straight away; only typing waits for a pause.
    const delay = normalised === "" ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = window.setTimeout(
      () => void startSearch(currentKey, normalised, categoryId),
      delay,
    );
    return () => window.clearTimeout(timer);
    // `view.key` is read but deliberately not a dependency: this runs when
    // what the cashier asked for changes, not when an answer arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, normalised, categoryId, startSearch]);

  const isAtBrowseLimit = view.items.length >= MAX_BROWSE_ITEMS;

  const loadMore = React.useCallback(() => {
    if (!view.hasMore || isLoadingMore || isSearching || isAtBrowseLimit) return;
    if (view.key !== currentKey) return;

    const key = view.key;
    const nextPage = view.page + 1;
    setIsLoadingMore(true);

    fetchPage({ query: normalised, categoryId, page: nextPage })
      .then((page) => {
        setView((current) => {
          // The cashier may have moved on to another search while this loaded.
          if (current.key !== key) return current;
          const seen = new Set(current.items.map((item) => item.id));
          const next: View = {
            key,
            // A product sold out and re-sorted between pages could otherwise
            // appear twice; the id decides.
            items: [...current.items, ...page.items.filter((item) => !seen.has(item.id))],
            hasMore: page.hasMore,
            page: nextPage,
          };
          remember(remembered.current, key, next);
          return next;
        });
      })
      .catch((cause: unknown) => setError(messageFor(cause)))
      .finally(() => setIsLoadingMore(false));
  }, [view, currentKey, normalised, categoryId, isLoadingMore, isSearching, isAtBrowseLimit]);

  const refresh = React.useCallback(() => {
    // Stock just changed, so nothing remembered can be trusted.
    remembered.current.clear();
    void startSearch(currentKey, normalised, categoryId);
  }, [currentKey, normalised, categoryId, startSearch]);

  const resolveCurrent = React.useCallback(async () => {
    if (view.key === currentKey && !inFlight.current) {
      return { items: view.items, hasMore: view.hasMore };
    }
    const cached = recall(remembered.current, currentKey);
    if (cached) return { items: cached.items, hasMore: cached.hasMore };

    // Enter pressed before the debounce fired, or while the answer is on its
    // way: use that answer rather than guessing from the previous one.
    const pending =
      inFlight.current?.key === currentKey
        ? inFlight.current.promise
        : startSearch(currentKey, normalised, categoryId);
    const result = await pending;
    return result ? { items: result.items, hasMore: result.hasMore } : { items: [], hasMore: false };
  }, [view, currentKey, normalised, categoryId, startSearch]);

  const findBySku = React.useCallback(async (sku: string) => {
    const response = await fetch(`/api/pos/products?sku=${encodeURIComponent(sku.trim())}`, {
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (response.status === 401) sendToSignIn();
    if (!response.ok) throw new Error("The product could not be looked up.");
    const body = (await response.json()) as { product: PosProduct | null };
    return body.product;
  }, []);

  // A search in flight is abandoned when the till unmounts.
  React.useEffect(() => () => inFlight.current?.controller.abort(), []);

  // While a new search loads, the previous results stay on screen (dimmed by
  // the grid) rather than the grid blanking on every keystroke.
  return {
    items: view.items,
    hasMore: view.hasMore && !isAtBrowseLimit,
    isSearching,
    isLoadingMore,
    isAtBrowseLimit: isAtBrowseLimit && view.hasMore,
    error,
    loadMore,
    refresh,
    resolveCurrent,
    findBySku,
  };
}

/** Lower-case, single-spaced: "  Cement  bag" and "cement bag" are one search. */
function normaliseQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

function keyOf(query: string, categoryId: string): string {
  return `${categoryId}\u0000${query}`;
}

async function fetchPage(
  { query, categoryId, page }: { query: string; categoryId: string; page: number },
  signal?: AbortSignal,
): Promise<CataloguePage> {
  const params = new URLSearchParams({ page: String(page), categoryId });
  if (query) params.set("q", query);

  const response = await fetch(`/api/pos/products?${params}`, { signal, cache: "no-store" });
  if (response.status === 401) sendToSignIn();
  if (!response.ok) throw new Error("The catalogue could not be loaded.");
  return (await response.json()) as CataloguePage;
}

/**
 * The session has ended — timed out, or the account was changed.
 *
 * <p>A full navigation rather than a router push, so everything the till holds
 * in memory goes with the session it belonged to.
 */
function sendToSignIn(): never {
  window.location.assign(`${routes.cashierLogin}?next=${encodeURIComponent(routes.cashierPos)}`);
  throw new Error("Signed out.");
}

function remember(store: Map<string, Remembered>, key: string, view: Omit<Remembered, "at">): void {
  store.delete(key);
  store.set(key, { ...view, at: Date.now() });
  // A Map iterates in insertion order, so the first key is the least recent.
  while (store.size > MAX_REMEMBERED) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

function recall(store: Map<string, Remembered>, key: string): Omit<Remembered, "at"> | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > RESULT_TTL_MS) {
    store.delete(key);
    return null;
  }
  return { items: hit.items, hasMore: hit.hasMore, page: hit.page };
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function messageFor(cause: unknown): string {
  return cause instanceof Error && cause.message !== "Signed out."
    ? "The catalogue could not be loaded. Check the connection and try again."
    : "Signing you in again…";
}
