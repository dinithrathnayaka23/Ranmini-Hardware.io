import type { Metadata } from "next";

import { SetPasswordScreen } from "@/modules/auth/components/set-password-screen";

export const metadata: Metadata = {
  title: "Choose Your Password",
  robots: { index: false, follow: false },
};

/**
 * `/admin/set-password` — replacing a temporary password.
 *
 * Rarely reached: it happens when one owner resets the other's password from
 * the Staff screen. The rule is the same as at the till, so it needs the page.
 */
export default function AdminSetPasswordPage() {
  return <SetPasswordScreen portal="admin" />;
}
