import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { AuthHeading } from "@/modules/auth/components/auth-heading";
import { CashierRecovery } from "@/modules/auth/components/cashier-recovery";

export const metadata: Metadata = {
  title: "Forgot Password",
  // Recovery pages have no business in a search index.
  robots: { index: false, follow: false },
};

/**
 * `/cashier/forgot-password` — getting back into a till account.
 *
 * Two routes on one page: ask the owner (for the many cashier accounts with no
 * email address) or have a link emailed. Either ends with the cashier choosing
 * a password only they know.
 */
export default function CashierForgotPasswordPage() {
  return (
    <div>
      <AuthHeading
        badge={{ icon: KeyRound, label: "Account Recovery" }}
        title="Forgot Your Password?"
        description="Choose how you would like to get back into your account."
      />

      <div className="mt-8 sm:mt-10">
        <CashierRecovery />
      </div>
    </div>
  );
}
