import type { Metadata } from "next";

import { SetPasswordScreen } from "@/modules/auth/components/set-password-screen";

export const metadata: Metadata = {
  title: "Choose Your Password",
  robots: { index: false, follow: false },
};

/**
 * `/cashier/set-password` — replacing a temporary password the owner issued.
 *
 * The till sends a cashier here instead of to the point of sale for as long as
 * their password is one the owner chose.
 */
export default function CashierSetPasswordPage() {
  return <SetPasswordScreen portal="cashier" />;
}
