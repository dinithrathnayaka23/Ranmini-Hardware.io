import type { Metadata } from "next";

import { ResetPasswordScreen } from "@/modules/auth/components/reset-password-screen";

export const metadata: Metadata = {
  title: "Set a New Password",
  robots: { index: false, follow: false },
};

/**
 * `/cashier/reset-password?token=…` — where a cashier's reset email lands.
 *
 * The backend picks this address from the account's role, so a cashier always
 * finishes on the till's sign-in page, which is the only one that accepts them.
 */
export default async function CashierResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordScreen token={token} portal="cashier" />;
}
