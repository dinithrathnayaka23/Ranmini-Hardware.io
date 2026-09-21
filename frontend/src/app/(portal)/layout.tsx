import { requireAdmin } from "@/modules/auth/services/session.server";
import { fetchNotifications } from "@/modules/notifications/services/notifications.server";
import { PortalShell } from "@/shared/components/layout/portal-shell";
import { ShopProvider } from "@/shared/components/shop-provider";
import { guardedLoad } from "@/shared/lib/guarded-load";
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
  // All three in parallel: none depends on another, and the session check is a
  // round trip the other two should not have to queue behind. `guardedLoad`
  // keeps that overlap while making sure `requireAdmin` is the only thing that
  // can decide the outcome — a cashier who opens a portal URL must be sent to
  // the till, not shown whatever error the administrator-only feed below
  // happens to return first. See the note in guarded-load.ts; the till had
  // exactly this bug.
  //
  // The notification feed is read here, on every navigation, rather than polled
  // from the browser. A portal somebody is using navigates often enough to keep
  // the badge current, and a poll on a screen left open on the counter would be
  // a request every few seconds all night to learn that nothing had changed.
  const [user, shop, notifications] = await guardedLoad(
    requireAdmin(),
    getShopSettings("admin"),
    fetchNotifications(),
  );

  return (
    <ShopProvider settings={shop}>
      <PortalShell user={user} notifications={notifications}>
        {children}
      </PortalShell>
    </ShopProvider>
  );
}
