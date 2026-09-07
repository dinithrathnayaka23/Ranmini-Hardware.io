import type { Metadata } from "next";

import { requireCashier } from "@/modules/auth/services/session.server";
import { PosTerminal } from "@/modules/pos/components/pos-terminal";
import { TERMINAL_NAME } from "@/modules/pos/constants/pos-data";
import { fetchCategories, fetchProducts } from "@/modules/pos/services/pos.server";
import { ShopProvider } from "@/shared/components/shop-provider";
import { getShopSettings } from "@/shared/lib/shop.server";

export const metadata: Metadata = {
  title: "Point of Sale",
};

/**
 * `/cashier/pos` — the till, and the only screen a cashier has.
 *
 * <p>A Server Component that resolves the session and loads the catalogue
 * before rendering, so the till arrives with products already in it. A cashier
 * opening this should see the grid immediately, not a spinner while the browser
 * makes two more round trips over a shop's connection.
 *
 * <p>The catalogue and the categories are fetched in parallel: they do not
 * depend on each other, and awaiting them in sequence would add a whole round
 * trip to every page load for nothing.
 */
export default async function CashierPosPage() {
  // The middleware already redirected a visitor with no cookie. This is the
  // check that actually holds: it asks the backend who the token belongs to, so
  // a forged or expired cookie stops here rather than rendering the till — and
  // an administrator's, valid though it is, goes back to the dashboard, because
  // the till belongs to the counter.
  const [user, categories, products, shop] = await Promise.all([
    requireCashier(),
    fetchCategories(),
    fetchProducts(),
    // The shop's own currency and receipt details, read here rather than in the
    // components that print them: a client component cannot reach the API, and
    // fetching after the first paint would show a basket priced in the wrong
    // symbol for a moment.
    getShopSettings(),
  ]);

  return (
    <ShopProvider settings={shop}>
      <PosTerminal
        products={products}
        categories={categories}
        terminalName={TERMINAL_NAME}
        cashierName={user.fullName}
      />
    </ShopProvider>
  );
}
