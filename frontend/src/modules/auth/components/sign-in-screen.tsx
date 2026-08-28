import type { PortalDefinition } from "../constants/portals";

import { LoginForm } from "./login-form";

/**
 * The body of a sign-in screen: heading, supporting line, and the form.
 *
 * A Server Component — only the form beneath it runs on the client. The
 * surrounding brand header, showcase panel and legal footer come from the
 * `(auth)` layout, so a portal's page file is left with nothing but its
 * metadata and which portal it is.
 */
export function SignInScreen({ portal }: { portal: PortalDefinition }) {
  return (
    <div>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2rem]">
        {portal.title}
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        {portal.subtitle}
      </p>

      <div className="mt-8 sm:mt-12">
        <LoginForm portal={portal} />
      </div>
    </div>
  );
}
