import type { Metadata } from "next";

import { requireSession } from "@/modules/auth/services/session.server";
import { PosTerminal } from "@/modules/pos/components/pos-terminal";
import { TERMINAL_NAME } from "@/modules/pos/constants/pos-data";
import { fetchCategories, fetchProducts } from "@/modules/pos/services/pos.server";

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
  // a forged or expired cookie stops here rather than rendering the till.
  const [user, categories, products] = await Promise.all([
    requireSession(),
    fetchCategories(),
    fetchProducts(),
  ]);

  return (
    <PosTerminal
      products={products}
      categories={categories}
      terminalName={TERMINAL_NAME}
      cashierName={user.fullName}
    />
  );
}
