"use client";

import { Menu } from "lucide-react";

import { AdminMenu } from "@/modules/auth/components/admin-menu";
import type { UserProfile } from "@/modules/auth/types/auth.types";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import type { NotificationFeed } from "@/modules/notifications/types/notifications.types";
import { ThemeToggle } from "@/shared/components/theme/theme-toggle";

import { Breadcrumbs } from "./breadcrumbs";

/**
 * Slim application bar above the content region.
 *
 * Carries the breadcrumb trail, which is the only place in the portal that says
 * where the current screen sits — the sidebar highlights a section but says
 * nothing about depth, so a sub-page like Settings → Receipts otherwise looks
 * identical to a top-level one.
 *
 * On phones it also owns the button that opens the navigation drawer; from
 * `lg` the rail is always visible so the button is hidden.
 */
export function Topbar({
  onOpenNav,
  user,
  notifications,
}: {
  onOpenNav: () => void;
  user: UserProfile;
  /**
   * Read on the server by the portal layout, so the badge is right in the
   * first paint and no client component ever has to fetch it.
   */
  notifications: NotificationFeed;
}) {
  return (
    // Sticky below `lg` because the page itself scrolls there; from `lg` the
    // shell is fixed height and only the content region moves, so it can be
    // static.
    <header
      data-print="hide"
      className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:static"
    >
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation menu"
        className="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas-subtle lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      {/* Takes the free space, which also keeps the actions right-aligned once
          the menu button is gone. `min-w-0` lets a long trail truncate rather
          than push the account menu off the bar. */}
      <Breadcrumbs className="flex-1" />

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Before the bell rather than after: the two icon buttons read as a
            pair, and the account menu stays the last thing on the bar, which
            is where every other admin tool puts it. */}
        <ThemeToggle />
        <NotificationBell initialFeed={notifications} />

        {/* A hairline between the utilities and the account, so three circles
            in a row do not read as one undifferentiated group. */}
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <AdminMenu admin={user} />
      </div>
    </header>
  );
}
