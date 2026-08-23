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

    const succeeded = await logout();

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
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        aria-busy={isPending}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rail-muted transition-colors hover:bg-rail-raised hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 aria-hidden className="size-[18px] shrink-0 animate-spin" />
        ) : (
          <LogOut aria-hidden className="size-[18px] shrink-0" />
        )}
        {isPending ? "Signing out…" : "Log out"}
      </button>

      {hasFailed ? (
        <p role="alert" className="mt-2 px-3 text-xs leading-relaxed text-white">
          Could not sign out. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
