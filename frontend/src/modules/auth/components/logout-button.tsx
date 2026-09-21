"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { routes } from "@/shared/config/app.config";

import { logout } from "../services/auth.client";

/**
 * Ends the session from the navigation rail.
 *
 * This is real: it posts to `/api/auth/logout`, which expires the httpOnly
 * cookies server-side. The browser cannot clear them itself, which is why a
 * client-only "log out" would leave the session very much alive.
 *
 * If the request fails the user is deliberately kept here with an error rather
 * than sent to the sign-in screen. Navigating away from a session that is still
 * valid would look like a sign-out without being one — the worst outcome on a
 * shared shop-floor machine.
 */
export function LogoutButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [hasFailed, setHasFailed] = React.useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    setHasFailed(false);

    const succeeded = await logout("admin");

    if (!succeeded) {
      setHasFailed(true);
      setIsPending(false);
      return;
    }

    onNavigate?.();

    // `replace` keeps the portal out of the back history, and `refresh` drops
    // the cached server render so nothing from the old session lingers.
    router.replace(routes.adminLogin);
    router.refresh();
  };

  return (
    <div>
      {/*
        Deliberately not shaped like a navigation row. It sat directly under
        eleven of them in the same typeface, at the same size, with the same
        hover — the one control on the rail that ends the session looked exactly
        like the ones that change the page. The border and the centred label
        make it read as an action, and the hover turns it red, which is the
        clearest way to say "this is the destructive one" before it is pressed
        rather than after.

        The colours are the rail's own, not the portal's `danger` token: this
        button sits on the navy rail, which stays navy in both themes, so a
        token that lightens for dark mode would drift out of step with the
        surface behind it. That independence is the whole reason the rail can
        be the fixed anchor the dark palette is measured against.
      */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        aria-busy={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-rail-line bg-rail-raised/50 px-3 py-2.5 text-sm font-medium text-rail-muted transition-colors hover:border-rail-danger/40 hover:bg-rail-danger/10 hover:text-rail-danger disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-rail-line disabled:hover:bg-rail-raised/50 disabled:hover:text-rail-muted"
      >
        {isPending ? (
          <Loader2 aria-hidden className="size-[18px] shrink-0 animate-spin" />
        ) : (
          <LogOut aria-hidden className="size-[18px] shrink-0" />
        )}
        {isPending ? "Signing out…" : "Log out"}
      </button>

      {hasFailed ? (
        <p
          role="alert"
          className="mt-2 px-1 text-xs leading-relaxed text-rail-danger"
        >
          Could not sign out. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
