import type { LucideIcon } from "lucide-react";
import { ScanLine, ShieldCheck } from "lucide-react";

import type { PortalDefinition, PortalId } from "../constants/portals";

import { AuthHeading } from "./auth-heading";
import { LoginForm } from "./login-form";

/**
 * Which door this is, said plainly above the heading.
 *
 * <p>Kept here rather than in `portals.ts` deliberately. That file is imported
 * by the Route Handler that receives credentials, and it is worth something
 * that a module on that path stays free of React components — a badge icon has
 * no business being reachable from the code that talks to the auth API.
 */
const portalBadges: Record<PortalId, { icon: LucideIcon; label: string }> = {
  admin: { icon: ShieldCheck, label: "Management Portal" },
  cashier: { icon: ScanLine, label: "Point of Sale" },
};

/**
 * The body of a sign-in screen: badge, heading, supporting line, and the form.
 *
 * A Server Component — only the form beneath it runs on the client. The
 * surrounding brand header, showcase panel and legal footer come from the
 * `(auth)` layout, so a portal's page file is left with nothing but its
 * metadata and which portal it is.
 */
export function SignInScreen({
  portal,
  redirectTo,
}: {
  portal: PortalDefinition;
  /** Forwarded from the page's search params; see LoginForm. */
  redirectTo?: string;
}) {
  return (
    <div>
      <AuthHeading
        badge={portalBadges[portal.id]}
        title={portal.title}
        description={portal.subtitle}
      />

      <div className="mt-8 sm:mt-10">
        <LoginForm portal={portal} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
