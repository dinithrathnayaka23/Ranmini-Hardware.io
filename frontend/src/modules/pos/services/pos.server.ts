import "server-only";

import { apiFetch, type PageResponse } from "@/shared/lib/api.server";

import type { PosCategory, PosProduct } from "../types/pos.types";

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
    // Categories change perhaps twice a year, so a short revalidation window
    // saves a request on every till load without risking a stale filter row.
    revalidate: 300,
    tags: ["categories"],
  });

  return categories.map((category) => ({ id: category.id, label: category.label }));
}

export async function fetchProducts(): Promise<PosProduct[]> {
  const page = await apiFetch<PageResponse<PosProductResponse>>(
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
  }));
}
