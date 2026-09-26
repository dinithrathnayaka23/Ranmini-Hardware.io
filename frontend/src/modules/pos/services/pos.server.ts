import "server-only";

import { cashierFetch } from "@/modules/auth/services/guarded-fetch.server";
import { apiFetch, apiFetchOrNull } from "@/shared/lib/api.server";

import { ALL_CATEGORIES, CATALOGUE_PAGE_SIZE } from "../constants/pos-data";
import type {
  CataloguePage,
  PosCategory,
  PosProduct,
  TillAlertFeed,
} from "../types/pos.types";

/**
 * Reads the till needs before it can render.
 *
 * <p>Both are fetched on the server so the page arrives with its catalogue
 * already in it. A cashier opening the till should see products immediately,
 * not a spinner while the browser makes two more round trips over a shop's
 * connection.
 */

/** Shape the backend returns for a category. */
interface CategoryResponse {
  id: string;
  label: string;
  slug: string;
  displayOrder: number;
}

/** A page of results and whether another follows; the till never needs a total. */
interface SliceResponse<T> {
  content: T[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/** Shape the backend returns for a till product — note: no cost price. */
interface PosProductResponse {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unitPrice: number;
  stock: number;
  status: PosProduct["status"];
  imageUrl: string | null;
  imageVersion: string | null;
}

export async function fetchCategories(): Promise<PosCategory[]> {
  const categories = await apiFetch<CategoryResponse[]>("/api/v1/categories", {
    // The till's own session. Both roles may read the category list, but the
    // cashier is the one asking, and a call made with whoever else happens to
    // be signed in on this machine is the mix-up the split sessions removed.
    session: "cashier",
    // Categories change perhaps twice a year, so a short revalidation window
    // saves a request on every till load without risking a stale filter row.
    revalidate: 300,
    tags: ["categories"],
  });

  // "All Items" is part of the filter UI, not a stored category, so it is
  // prepended here rather than existing as a row in the database that every
  // product would then have to avoid being assigned to.
  return [
    { id: ALL_CATEGORIES, label: "All Items" },
    ...categories.map((category) => ({ id: category.id, label: category.label })),
  ];
}

/**
 * The first screenful of the catalogue, rendered with the page.
 *
 * <p>Only the first page. Everything past it — further pages, searches, a
 * category — is fetched from the browser as the cashier asks for it, through
 * {@link searchCatalogue}. A shop's full catalogue is tens of thousands of lines,
 * and sending it all to a counter machine was never an option; sending the first
 * hundred and <em>filtering those</em> is what made most of the stock
 * impossible to find.
 */
export async function fetchProducts(): Promise<CataloguePage> {
  // No guard of its own: the till page runs this alongside requireCashier()
  // through guardedLoad, whose verdict decides what the visitor sees.
  return searchCatalogue({ query: "", categoryId: ALL_CATEGORIES, page: 1 });
}

/**
 * One page of the till's catalogue, for a search, a category, or neither.
 *
 * <p>Makes the call with the till's session and no redirect, so the route
 * handler the browser calls can answer a lost session with a plain 401 rather
 * than an HTML sign-in page it cannot parse.
 */
export async function searchCatalogue({
  query,
  categoryId,
  page,
}: {
  query: string;
  categoryId: string;
  page: number;
}): Promise<CataloguePage> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(CATALOGUE_PAGE_SIZE),
  });
  if (query.trim()) params.set("q", query.trim());
  if (categoryId && categoryId !== ALL_CATEGORIES) params.set("categoryId", categoryId);

  const slice = await apiFetch<SliceResponse<PosProductResponse>>(
    `/api/v1/pos/products?${params}`,
    // Never cached: this carries stock levels, and a cached stock level is a
    // wrong stock level the moment another till sells something.
    { session: "cashier", cache: "no-store" },
  );

  return { items: slice.content.map(toPosProduct), hasMore: slice.hasNext };
}

/**
 * A sellable product by its exact shelf code, or null when there is none.
 *
 * <p>For the Enter key. A full code must find its product even when other codes
 * start with the same characters and it would not be first alphabetically.
 */
export async function findBySku(sku: string): Promise<PosProduct | null> {
  const product = await apiFetchOrNull<PosProductResponse>(
    `/api/v1/pos/products/by-sku/${encodeURIComponent(sku)}`,
    { session: "cashier", cache: "no-store" },
  );
  return product ? toPosProduct(product) : null;
}

function toPosProduct(product: PosProductResponse): PosProduct {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    unitPrice: product.unitPrice,
    stock: product.stock,
    status: product.status,
    imageUrl: product.imageUrl,
    imageVersion: product.imageVersion,
  };
}

/**
 * The till's notification feed.
 *
 * <p>Read on the server with the page, like everything else the till needs, so
 * the bell arrives already knowing whether it has anything to say. It is also
 * re-read by `router.refresh()` after each sale, which is what makes a line
 * that has just gone low appear in the panel without polling.
 *
 * <p>Never cached: this is a warning about a shelf, and a warning that is
 * thirty seconds stale is a warning about a shelf the last customer already
 * emptied.
 *
 * <p>A failure is swallowed into an empty feed rather than thrown. The bell is
 * chrome on a screen whose job is to take money — a notification outage must
 * not be able to stop a shop serving customers.
 */
export async function fetchTillAlerts(): Promise<TillAlertFeed> {
  try {
    return await cashierFetch<TillAlertFeed>("/api/v1/pos/notifications", {
      cache: "no-store",
    });
  } catch {
    return { items: [], unreadCount: 0, generatedAt: new Date().toISOString() };
  }
}
