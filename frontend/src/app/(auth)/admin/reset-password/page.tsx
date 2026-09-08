import { KeyRound, LinkIcon } from "lucide-react";
import type { Metadata } from "next";

import { AuthHeading } from "@/modules/auth/components/auth-heading";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
import { isResetTokenValid } from "@/modules/auth/services/password-reset.server";
import { Alert } from "@/shared/components/ui/alert";
import { ButtonLink } from "@/shared/components/ui/button";
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
        <AuthHeading
          badge={{ icon: LinkIcon, label: "Expired Link" }}
          title="This Link Has Expired"
        />

        <div className="mt-8 space-y-6">
          <Alert message="Reset links work once and only for a short while. This one has been used already, or it has run out." />

          <p className="text-sm leading-relaxed text-muted">
            Ask for a fresh one and it will be in your inbox in a moment.
          </p>

          {/* The shared button rather than a hand-rolled link with the same
              colours spelled out again. It was the odd one out on these screens:
              a size and radius that matched nothing else, and one more place a
              change to the primary action would have had to be remembered. */}
          <ButtonLink href={routes.forgotPassword} className="w-full">
            Request a New Link
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        badge={{ icon: KeyRound, label: "Account Recovery" }}
        title="Set a New Password"
        description="Choose a password you have not used here before. You will use it the next time you sign in."
      />

      <div className="mt-8 sm:mt-10">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
