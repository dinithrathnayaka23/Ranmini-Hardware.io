import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
import { isResetTokenValid } from "@/modules/auth/services/password-reset.server";
import { Alert } from "@/shared/components/ui/alert";
import { routes } from "@/shared/config/app.config";

export const metadata: Metadata = {
  title: "Set a New Password",
  robots: { index: false, follow: false },
};

/**
 * `/admin/reset-password?token=…` — where a reset email lands.
 *
 * The token is checked here, on the server, before any form is drawn. Rendering
 * the form first and validating on submit would have somebody choose and type a
 * password twice only to be told the link expired overnight — and it would put
 * the "is this link live" question behind a button rather than answering it on
 * arrival.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await isResetTokenValid(token);

  if (!valid || !token) {
    return (
      <div>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2rem]">
          This Link Has Expired
        </h1>

        <div className="mt-8 space-y-6">
          <Alert message="Reset links work once and only for a short while. This one has been used already, or it has run out." />

          <p className="text-sm leading-relaxed text-muted">
            Ask for a fresh one and it will be in your inbox in a moment.
          </p>

          <Link
            href={routes.forgotPassword}
            className="inline-flex w-full items-center justify-center rounded-[10px] bg-brand-600 px-4 py-2.5
                       text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Request a New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2rem]">
        Set a New Password
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        Choose a password you have not used here before. You will use it the next
        time you sign in.
      </p>

      <div className="mt-8 sm:mt-12">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
