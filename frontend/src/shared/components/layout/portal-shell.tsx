"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";

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
export function PortalShell({ children }: { children: React.ReactNode }) {
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
      {isNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeNav}
            className="absolute inset-0 bg-ink/50"
          />

          <div
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
          </div>
        </div>
      ) : null}

      {/* ---------------------------- Content column --------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setIsNavOpen(true)} />

        {/* The scroll container on desktop: the page stays fixed, this moves. */}
        <main data-print="expand" className="min-h-0 flex-1 lg:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
