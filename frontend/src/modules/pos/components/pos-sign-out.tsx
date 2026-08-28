"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { logout } from "@/modules/auth/services/auth.client";
import { Button } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/app.config";

/**
 * Sign-out control for the till.
 *
 * A shared shop-floor machine must always offer a way out, even on a screen
 * that is otherwise a placeholder — leaving a cashier's session open on a
 * counter terminal is the failure mode that matters here.
 *
 * As on the admin rail, a failed request keeps the user on this page with an
 * error rather than redirecting: the cookies are httpOnly, so if the server did
 * not expire them the session is still very much alive, and navigating away
 * would only look like a sign-out.
 */
export function PosSignOut() {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [hasFailed, setHasFailed] = React.useState(false);

  const handleSignOut = async () => {
    setIsPending(true);
    setHasFailed(false);

    if (!(await logout())) {
      setHasFailed(true);
      setIsPending(false);
      return;
    }

    router.replace(routes.cashierLogin);
    router.refresh();
  };

  return (
    <div>
      <Button
        variant="secondary"
        size="md"
        onClick={handleSignOut}
        isLoading={isPending}
        loadingText="Signing out…"
      >
        <LogOut aria-hidden className="size-4" />
        Sign out
      </Button>

      {hasFailed ? (
        <p role="alert" className="mt-3 text-xs leading-relaxed text-danger">
          Could not sign out. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
