import type { Metadata } from "next";

import { placeholderCashier } from "@/modules/auth/constants/placeholder-session";
import { PosTerminal } from "@/modules/pos/components/pos-terminal";
import {
  TERMINAL_NAME,
  posCategories,
  posProducts,
} from "@/modules/pos/constants/pos-data";

export const metadata: Metadata = {
  title: "Point of Sale",
};

/**
 * `/cashier/pos` — the till, and the only screen a cashier has.
 *
 * A Server Component that does nothing but hand the catalogue to the terminal,
 * so replacing the placeholder constants with a fetch from the Spring Boot API
 * is a change here alone. It sits outside the `(portal)` route group because
 * the admin navigation rail is not the cashier's chrome — the till carries its
 * own top bar and no navigation at all.
 */
export default function CashierPosPage() {
  return (
    <PosTerminal
      products={posProducts}
      categories={posCategories}
      terminalName={TERMINAL_NAME}
      cashierName={placeholderCashier.fullName}
    />
  );
}
