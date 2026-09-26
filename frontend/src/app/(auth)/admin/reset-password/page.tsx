import type { Metadata } from "next";

import { ResetPasswordScreen } from "@/modules/auth/components/reset-password-screen";

export const metadata: Metadata = {
  title: "Set a New Password",
  robots: { index: false, follow: false },
};

/** `/admin/reset-password?token=…` — where an administrator's reset email lands. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordScreen token={token} portal="admin" />;
}
