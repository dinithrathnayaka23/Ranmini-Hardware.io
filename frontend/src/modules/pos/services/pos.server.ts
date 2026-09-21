import "server-only";

import { cashierFetch } from "@/modules/auth/services/guarded-fetch.server";
import { apiFetch, type PageResponse } from "@/shared/lib/api.server";

import { ALL_CATEGORIES } from "../constants/pos-data";
import type { PosCategory, PosProduct, TillAlertFeed } from "../types/pos.types";

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

/**
 * How many products the till loads up front.
 *
 * <p>The whole catalogue would be thousands of lines on a real shop's data, and
 * sending all of it to a counter machine on every page load is slow on the wire
 * before it is slow to render. This is enough to fill several screens of the
 * grid; anything beyond it is reached by searching, which queries the backend
 * rather than filtering what was already sent.
 */
const CATALOGUE_PAGE_SIZE = 100;

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

export async function fetchProducts(): Promise<PosProduct[]> {
  const page = await cashierFetch<PageResponse<PosProductResponse>>(
    `/api/v1/pos/products?size=${CATALOGUE_PAGE_SIZE}`,
    {
      // Never cached: this carries stock levels, and a cached stock level is a
      // wrong stock level the moment another till sells something.
      cache: "no-store",
    },
  );

  return page.content.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    unitPrice: product.unitPrice,
    stock: product.stock,
    status: product.status,
    imageUrl: product.imageUrl,
    imageVersion: product.imageVersion,
  }));
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
