import { requireAdmin } from "@/modules/auth/services/session.server";
import { PortalShell } from "@/shared/components/layout/portal-shell";
import { ShopProvider } from "@/shared/components/shop-provider";
import { getShopSettings } from "@/shared/lib/shop.server";

/**
 * Layout for every signed-in screen in the management portal.
 *
 * Route group `(portal)` keeps this chrome off the unauthenticated screens in
 * `(auth)` while leaving both under the same `/admin/*` URL space — the group
 * name is a folder convention only and never appears in the path.
 *
 * This is where access to the whole portal is decided. The middleware already
 * bounced anyone without a session cookie, but that check only looks for the
 * cookie's presence — it cannot verify a token without a network call on every
 * navigation. `requireAdmin` asks the backend who the token actually belongs
 * to, so a forged or expired cookie stops here, and a signed-in cashier is sent
 * to the till rather than shown a portal they cannot use.
 *
 * Doing it in the layout rather than in each page means a screen added later is
 * protected by default instead of by remembering.
 *
 * It is also where the shop's own settings enter the client tree. Every screen
 * that prints an amount needs the currency symbol, and reading it once here
 * beats each of a dozen components asking for it — or, as before, all of them
 * printing a constant compiled into the build and ignoring the setting the
 * owner had chosen.
 */
export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // In parallel: neither depends on the other, and the session check is a round
  // trip to the API that the settings read should not queue behind.
  const [user, shop] = await Promise.all([requireAdmin(), getShopSettings()]);

  return (
    <ShopProvider settings={shop}>
      <PortalShell user={user}>{children}</PortalShell>
    </ShopProvider>
  );
}
