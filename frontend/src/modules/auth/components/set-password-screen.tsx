import { ShieldCheck } from "lucide-react";

import type { PortalId } from "../constants/portals";
import { requirePasswordChange } from "../services/session.server";

import { AuthHeading } from "./auth-heading";
import { SetPasswordForm } from "./set-password-form";

/**
 * The page a temporary-password session is confined to, for either portal.
 *
 * Greets the person by name, so somebody who sat down at a machine signed in as
 * a colleague notices before choosing a password for the wrong account.
 */
export async function SetPasswordScreen({ portal }: { portal: PortalId }) {
  const user = await requirePasswordChange(portal);
  const firstName = user.fullName.split(" ")[0] || user.username;

  return (
    <div>
      <AuthHeading
        badge={{ icon: ShieldCheck, label: "Choose Your Password" }}
        title={`Welcome back, ${firstName}`}
        description="You signed in with a temporary password. Choose one only you know before you continue."
      />

      <div className="mt-8 sm:mt-10">
        <SetPasswordForm portal={portal} />
      </div>
    </div>
  );
}
