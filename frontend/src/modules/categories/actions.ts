"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { routes } from "@/shared/config/app.config";
import { apiFetch } from "@/shared/lib/api.server";
import { ApiError, errorMessages } from "@/shared/lib/http-error";

import { categoryIdSchema, categoryNameSchema } from "./schemas/category.schema";
import { fetchCategories } from "./services/categories.server";

/**
 * Managing the shop's product categories.
 *
 * <p>Server Actions rather than route handlers, for the same reason as
 * everywhere else in the portal: the session token is in an httpOnly cookie the
 * browser cannot read, so the call to the API has to happen on the server
 * anyway, and an action keeps that from becoming a hand-written endpoint per
 * mutation.
 *
 * <p>Every action re-validates its input. The forms already did, but a Server
 * Action is exposed over HTTP like any other endpoint, so the browser's checks
 * are a convenience and these are the ones that count — with the backend's own
 * validation behind them as the real authority.
 */

export type CategoryActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

/**
 * Everywhere a category change is visible.
 *
 * <p>Three surfaces, and it is easy to forget the second two. The till reads
 * the filter chips through a tagged, revalidating fetch, so it needs the tag
 * rather than a path sweep. The inventory table and the add-product form both
 * show category names — the table because the backend denormalises the name
 * onto every product, so a rename has to reach it too.
 *
 * <p>Those two pages read with `no-store`, which makes the path calls look
 * redundant. They are not: the client-side Router Cache still holds the payload
 * rendered on the last visit, and without this a navigation back to either
 * screen would show the category list as it was before the change.
 */
function revalidateCategoryViews(): void {
  revalidateTag("categories");
  revalidatePath(routes.adminInventoryCategories);
  revalidatePath(routes.adminInventory);
  revalidatePath(routes.adminInventoryNew);
}

/** Adds a category, placed after the ones that already exist. */
export async function createCategory(values: unknown): Promise<CategoryActionResult> {
  const parsed = categoryNameSchema.safeParse(readName(values));
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    // Appended rather than left at the backend's default of 0, so a new
    // category joins the end of the till's chip row instead of jumping to the
    // front of a list the shop has already arranged.
    const existing = await fetchCategories();

    await apiFetch("/api/v1/categories", {
      method: "POST",
      body: { name: parsed.data, displayOrder: existing.length },
    });

    revalidateCategoryViews();
    return { success: true, message: `${parsed.data} has been added.` };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Renames a category.
 *
 * <p>The backend fans the new name out to every product that carries it, in one
 * bulk update, and leaves the slug alone. So this is safe to do at any time —
 * the only visible change is the wording on the chips and in the table.
 */
export async function renameCategory(
  categoryId: unknown,
  name: unknown,
): Promise<CategoryActionResult> {
  const id = readId(categoryId);
  if (!id) return notFound();

  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    await apiFetch(`/api/v1/categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { name: parsed.data },
    });

    revalidateCategoryViews();
    return { success: true, message: `Renamed to ${parsed.data}.` };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Moves a category one place up or down the till's chip row.
 *
 * <p>Written as a whole-list renumber rather than a swap of two numbers. Every
 * category is created at display order 0 unless somebody chose otherwise, and
 * swapping two zeroes changes nothing — so the new arrangement is persisted as
 * a dense 0..n-1 sequence and only the rows that actually moved are written.
 *
 * <p>On a list that has never been ordered that is one write per category,
 * once. Acceptable precisely because this list is bounded by design: it is the
 * shop's shelf labels, not a data set that grows with trade.
 */
export async function moveCategory(
  categoryId: unknown,
  direction: unknown,
): Promise<CategoryActionResult> {
  const id = readId(categoryId);
  if (!id) return notFound();
  if (direction !== "up" && direction !== "down") {
    return { success: false, message: "That is not a direction." };
  }

  try {
    const ordered = await fetchCategories();
    const from = ordered.findIndex((category) => category.id === id);
    if (from === -1) return notFound();

    const to = direction === "up" ? from - 1 : from + 1;

    // A backstop for the buttons the list already disables at each end: saying
    // "it is already first" is friendlier than an error for a click that asked
    // for nothing impossible.
    if (to < 0 || to >= ordered.length) {
      return {
        success: true,
        message: `${ordered[from].name} is already ${direction === "up" ? "first" : "last"}.`,
      };
    }

    const reordered = [...ordered];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

    const writes = reordered
      .map((category, position) => ({ category, position }))
      .filter(({ category, position }) => category.displayOrder !== position);

    await Promise.all(
      writes.map(({ category, position }) =>
        apiFetch(`/api/v1/categories/${encodeURIComponent(category.id)}/order`, {
          method: "PATCH",
          body: { displayOrder: position },
        }),
      ),
    );

    revalidateCategoryViews();
    return { success: true, message: `${ordered[from].name} moved ${direction}.` };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Retires a category.
 *
 * <p>Nothing is deleted. The backend deactivates the record, so last year's
 * sales can still name what was sold, and its products stay sellable — pulling
 * a whole shelf off the till because somebody tidied the category list would be
 * a far worse surprise than an unfiled product.
 *
 * <p>There is no way back from this screen: the API lists active categories
 * only and exposes no reactivate, so a retired category can be recreated under
 * the same name but not restored. The confirmation copy says so.
 */
export async function deactivateCategory(
  categoryId: unknown,
): Promise<CategoryActionResult> {
  const id = readId(categoryId);
  if (!id) return notFound();

  try {
    await apiFetch(`/api/v1/categories/${encodeURIComponent(id)}`, { method: "DELETE" });

    revalidateCategoryViews();
    return {
      success: true,
      message:
        "Category retired. Its products are still on sale and still named after it.",
    };
  } catch (error) {
    return failure(error);
  }
}

/** Accepts either a bare name or the add form's `{ name }` object. */
function readName(values: unknown): unknown {
  if (typeof values === "object" && values !== null && "name" in values) {
    return (values as { name: unknown }).name;
  }
  return values;
}

function readId(value: unknown): string | null {
  const parsed = categoryIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function notFound(): CategoryActionResult {
  return { success: false, message: "That category could not be found." };
}

/** The API's own message where there is one; vetted copy where there is not. */
function failure(error: unknown): CategoryActionResult {
  if (error instanceof ApiError) return { success: false, message: error.message };
  return { success: false, message: errorMessages.unexpected };
}
