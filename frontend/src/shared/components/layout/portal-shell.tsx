"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import * as React from "react";

import type { UserProfile } from "@/modules/auth/types/auth.types";
import type { NotificationFeed } from "@/modules/notifications/types/notifications.types";

import { backdropMotion, drawerLeftMotion } from "../ui/dialog-motion";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Application shell for every signed-in portal screen.
 *
 * HEIGHT STRATEGY (matching the sign-in screen)
 *
 * From `lg` the shell is pinned to exactly one viewport, so a desktop or laptop
 * never scrolls the page: the rail and the top bar stay put and only the
 * content region moves. Below `lg` the height is a minimum rather than a cap
 * and the page scrolls normally, because a phone keyboard covers half the
 * screen and locking the viewport there would trap the user — the top bar is
 * sticky so navigation stays reachable while scrolling.
 */
export function PortalShell({
  children,
  user,
  notifications,
}: {
  children: React.ReactNode;
  /**
   * Resolved on the server by the portal layout and handed down.
   *
   * The shell is a Client Component, so it cannot read the session cookie —
   * which is the point. Looking the user up from the browser would need an
   * endpoint that hands out account details to whoever asks.
   */
  user: UserProfile;
  /** The notification feed, resolved on the server alongside the user. */
  notifications: NotificationFeed;
}) {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const pathname = usePathname();

  const closeNav = React.useCallback(() => setIsNavOpen(false), []);

  // Navigating from inside the drawer should dismiss it; without this the
  // overlay would still be covering the page the user just asked for.
  React.useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  // Escape is the expected way out of any overlay.
  React.useEffect(() => {
    if (!isNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isNavOpen]);

  // Stop the page behind the drawer from scrolling under it.
  React.useEffect(() => {
    if (!isNavOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isNavOpen]);

  return (
    <div
      data-print="expand"
      className="flex min-h-dvh bg-canvas-subtle lg:h-dvh lg:overflow-hidden"
    >
      {/* --------------------------- Persistent rail --------------------------- */}
      <Sidebar data-print="hide" className="hidden shrink-0 lg:flex" />

      {/* ---------------------------- Mobile drawer ---------------------------- */}
      {/* Slides in from the edge it lives on, so it reads as the rail being
          pulled out rather than a panel appearing from nowhere. */}
      <AnimatePresence>
        {isNavOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              {...backdropMotion}
              type="button"
              aria-label="Close navigation menu"
              onClick={closeNav}
              className="absolute inset-0 bg-scrim"
            />

            <motion.div
              {...drawerLeftMotion}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="absolute inset-y-0 left-0 w-64 shadow-xl"
            >
              <Sidebar onNavigate={closeNav} />
              <button
                type="button"
                onClick={closeNav}
                aria-label="Close navigation menu"
                className="absolute top-4 -right-12 inline-flex size-10 items-center justify-center rounded-lg bg-surface text-ink-soft shadow-sm"
              >
                <X aria-hidden className="size-5" />
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* ---------------------------- Content column --------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenNav={() => setIsNavOpen(true)}
          user={user}
          notifications={notifications}
        />

        {/* The scroll container on desktop: the page stays fixed, this moves. */}
        <main data-print="expand" className="min-h-0 flex-1 lg:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
