import { NextResponse } from "next/server";

import { getSession } from "@/modules/auth/services/session.server";
import {
  ALL_CATEGORIES,
  CATALOGUE_PAGE_SIZE,
  MAX_BROWSE_ITEMS,
} from "@/modules/pos/constants/pos-data";
import { findBySku, searchCatalogue } from "@/modules/pos/services/pos.server";
import { ApiError } from "@/shared/lib/http-error";

export const dynamic = "force-dynamic";

/** Deepest page the grid can scroll to; see MAX_BROWSE_ITEMS. */
const MAX_PAGE = Math.ceil(MAX_BROWSE_ITEMS / CATALOGUE_PAGE_SIZE);

/** Category ids are MongoDB ObjectIds; "all" is the till's own "no filter". */
const CATEGORY_ID = /^(all|[a-f0-9]{24})$/i;

/**
 * GET /api/pos/products — the till's catalogue, as the cashier searches.
 *
 * <p>`?q=&categoryId=&page=` for a page of results, or `?sku=` for one product
 * by its exact shelf code. The browser cannot call the API directly — the
 * session token is an httpOnly cookie it never sees — so this attaches it on
 * the server.
 *
 * <p><b>Everything from the browser is checked before it reaches the API.</b>
 * Lengths are capped, the category must be an id, and the page must be one the
 * grid could actually scroll to, so a hand-made request cannot ask for page two
 * million or a ten-kilobyte search.
 *
 * <p>A lost session is answered with a plain 401, not a redirect: this is
 * called by `fetch`, which would follow a redirect to the sign-in page and try
 * to read its HTML as products.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await getSession("cashier");
  if (!user || user.role !== "CASHIER" || user.passwordChangeRequired) {
    return json({ message: "Please sign in at the till again." }, 401);
  }

  const params = new URL(request.url).searchParams;

  try {
    const sku = params.get("sku");
    if (sku !== null) {
      const code = sku.trim();
      if (code === "" || code.length > 64) return json({ message: "Invalid code." }, 400);

      const product = await findBySku(code);
      return product ? json({ product }) : json({ product: null }, 404);
    }

    const query = (params.get("q") ?? "").trim();
    const categoryId = params.get("categoryId") ?? ALL_CATEGORIES;
    const page = Number(params.get("page") ?? "1");

    if (query.length > 100 || !CATEGORY_ID.test(categoryId)) {
      return json({ message: "Invalid search." }, 400);
    }
    if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
      return json({ message: "Invalid page." }, 400);
    }

    return json(await searchCatalogue({ query, categoryId, page }));
  } catch (error) {
    if (error instanceof ApiError) {
      const status = error.status === 401 || error.status === 403 ? 401 : 502;
      return json({ message: error.message }, status);
    }
    console.error("[pos] Catalogue request failed:", error);
    return json({ message: "The catalogue could not be loaded." }, 502);
  }
}

function json(body: unknown, status = 200): NextResponse {
  // Stock levels change with every sale at every till; never cache them.
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
