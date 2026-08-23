import { PortalShell } from "@/shared/components/layout/portal-shell";

/**
 * Layout for every signed-in screen in the management portal.
 *
 * Route group `(portal)` keeps this chrome off the unauthenticated screens in
 * `(auth)` while leaving both under the same `/admin/*` URL space — the group
 * name is a folder convention only and never appears in the path.
 *
 * TODO(auth): once middleware is in place, this is where the session cookie
 * should be checked so an unauthenticated request is redirected to sign-in
 * before any portal markup is rendered.
 */
export default function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PortalShell>{children}</PortalShell>;
}
