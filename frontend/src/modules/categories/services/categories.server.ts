import "server-only";

import { adminFetch } from "@/modules/auth/services/guarded-fetch.server";

import type { Category } from "../types/category.types";

/**
 * Category reads for the management portal.
 *
 * <p>Separate from the till's `fetchCategories` in the POS module even though
 * both call the same endpoint, and deliberately so: the till prepends a
 * synthetic "All Items" chip and caches the list for five minutes, neither of
 * which is right for the screen that edits it.
 */

/** Wire shape. The backend names the display field `label`; see `Category`. */
interface CategoryResponse {
  id: string;
  label: string;
  slug: string;
  displayOrder: number;
}

/**
 * Every active category, in the order the till shows them.
 *
 * <p>Read fresh rather than from the cached copy the till uses. This is the
 * screen that reorders and renames them, and showing a five-minute-old list
 * immediately after a change would read as the save having failed.
 *
 * <p>Not paged, because the endpoint is not: the list is a bounded handful of
 * shelf names by design, and the till has to render all of them in one row.
 */
export async function fetchCategories(): Promise<Category[]> {
  const response = await adminFetch<CategoryResponse[]>("/api/v1/categories", {
    cache: "no-store",
  });

  return response.map((category) => ({
    id: category.id,
    name: category.label,
    slug: category.slug,
    displayOrder: category.displayOrder,
  }));
}
