import type { Metadata } from "next";

import { SignInScreen } from "@/modules/auth/components/sign-in-screen";
import { portals } from "@/modules/auth/constants/portals";

export const metadata: Metadata = {
  title: "Cashier Sign In",
};

/**
 * `/cashier/login` — the till's own door into the system.
 *
 * Reads the `next` search param the middleware adds when it bounces a
 * signed-out visitor here, so signing in returns them to where they were going
 * rather than dumping everyone on the landing page.
 */
export default async function CashierLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <SignInScreen portal={portals.cashier} redirectTo={next} />;
}
