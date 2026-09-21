"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { logout } from "@/modules/auth/services/auth.client";
import { routes } from "@/shared/config/app.config";

/**
 * Sign-out control in the till's top bar.
 *
 * A shared counter terminal must always offer a way out, and it has to be a
 * real one: the session cookies are httpOnly, so only the server can expire
 * them. A failed request therefore keeps the cashier here with an error rather
 * than redirecting — walking away from a session that is still live is the
 * worst outcome on a shop floor.
 */
export function PosSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [hasFailed, setHasFailed] = React.useState(false);

  const handleSignOut = async () => {
    setIsPending(true);
    setHasFailed(false);

    if (!(await logout("cashier"))) {
      setHasFailed(true);
      setIsPending(false);
      return;
    }

    router.replace(routes.cashierLogin);
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        aria-busy={isPending}
        className="inline-flex touch-manipulation items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut aria-hidden className="size-[18px] shrink-0" />
        {/* The word is dropped on the narrowest phones, where the icon plus its
            accessible name carries the meaning and the space is worth more. */}
        <span className="sr-only min-[380px]:not-sr-only">
          {isPending ? "Logging out…" : "Logout"}
        </span>
      </button>

      {hasFailed ? (
        // Absolutely positioned so a failure never reflows the top bar and
        // nudges the Logout button out from under the cashier's cursor.
        <p
          role="alert"
          className="absolute top-full right-0 z-10 mt-1 w-56 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger"
        >
          Could not log out. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
