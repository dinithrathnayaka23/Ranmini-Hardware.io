import type { Metadata } from "next";

import { SignInScreen } from "@/modules/auth/components/sign-in-screen";
import { portals } from "@/modules/auth/constants/portals";

export const metadata: Metadata = {
  title: "Admin Sign In",
};

/** `/admin/login` — entry point to the management portal. */
export default function AdminLoginPage() {
  return <SignInScreen portal={portals.admin} />;
}
