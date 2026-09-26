import { KeyRound, LinkIcon } from "lucide-react";

import { Alert } from "@/shared/components/ui/alert";
import { ButtonLink } from "@/shared/components/ui/button";

import { portals, type PortalId } from "../constants/portals";
import { isResetTokenValid } from "../services/password-reset.server";

import { AuthHeading } from "./auth-heading";
import { ResetPasswordForm } from "./reset-password-form";

/**
 * Where an emailed reset link lands, for either portal.
 *
 * The token is checked here, on the server, before any form is drawn. Rendering
 * the form first and validating on submit would have somebody choose and type a
 * password twice only to be told the link expired overnight — and it would put
 * the "is this link live" question behind a button rather than answering it on
 * arrival.
 *
 * Shared by both portals because only the destinations differ: the backend
 * addresses a cashier's link to the till's copy of this page, so the "request a
 * new link" button and the sign-in page afterwards are the ones they can use.
 */
export async function ResetPasswordScreen({
  token,
  portal,
}: {
  token: string | undefined;
  portal: PortalId;
}) {
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

          <ButtonLink href={portals[portal].forgotPasswordRoute} className="w-full">
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
        <ResetPasswordForm token={token} portal={portal} />
      </div>
    </div>
  );
}
