import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { AuthHeading } from "@/modules/auth/components/auth-heading";
import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  // Recovery pages have no business in a search index, and a crawler following
  // one would only ever generate noise for whoever owns the address.
  robots: { index: false, follow: false },
};

/**
 * `/admin/forgot-password` — asks for a reset link by email.
 *
 * Offered on the admin portal only. Cashier accounts are reset by an
 * administrator in person, so the till's sign-in page shows no link rather than
 * a dead end.
 */
export default function ForgotPasswordPage() {
  return (
    <div>
      <AuthHeading
        badge={{ icon: KeyRound, label: "Account Recovery" }}
        title="Forgot Your Password?"
        description="Enter the email address on your account and we will send you a link to choose a new password."
      />

      <div className="mt-8 sm:mt-10">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
