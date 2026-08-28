import type { Metadata } from "next";

import { SignInScreen } from "@/modules/auth/components/sign-in-screen";
import { portals } from "@/modules/auth/constants/portals";

export const metadata: Metadata = {
  title: "Cashier Sign In",
};

/**
 * `/cashier/login` — the till's own door into the system.
 *
 * Deliberately a separate URL from the admin sign-in rather than a role picker
 * on one page: shop-floor machines can be bookmarked straight to this address,
 * and the two portals stay separable if the till is later locked down to
 * specific devices.
 */
export default function CashierLoginPage() {
  return <SignInScreen portal={portals.cashier} />;
}
