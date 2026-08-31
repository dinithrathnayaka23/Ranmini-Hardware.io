"use client";

import { Bell, Menu } from "lucide-react";

import { AdminMenu } from "@/modules/auth/components/admin-menu";
import type { UserProfile } from "@/modules/auth/types/auth.types";

/**
 * Slim application bar above the content region.
 *
 * On phones it also owns the button that opens the navigation drawer; from
 * `lg` the rail is always visible so the button is hidden.
 */
export function Topbar({
  onOpenNav,
  user,
}: {
  onOpenNav: () => void;
  user: UserProfile;
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

      {/* Spacer keeps the actions right-aligned once the menu button is gone. */}
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas-subtle"
        >
          <Bell aria-hidden className="size-5" />
        </button>
        <AdminMenu admin={user} />
      </div>
    </header>
  );
}
