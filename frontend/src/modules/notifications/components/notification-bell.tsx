"use client";

import { Ban, Bell, PackageX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { routes } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";

import { markNotificationsRead } from "../actions";
import type {
  Notification,
  NotificationFeed,
  NotificationKind,
} from "../types/notifications.types";

/**
 * The bell in the top bar.
 *
 * <p>It used to be a button that did nothing. It now shows what the shop needs
 * to act on: products that have run out, products at or below their reorder
 * level, and sales that were voided in the last week — that last one because a
 * void puts stock back and takes money out of the day's takings, and a till
 * where that happens unseen is the oldest hole in retail.
 *
 * <p><b>Opening the panel is what marks the feed read.</b> One request does
 * both: the API returns the feed it has just stamped as seen, so the badge
 * clears and the rows update together rather than in two steps with a flicker
 * between them.
 *
 * <p>The badge is not polled. It is re-read on the server with every page load,
 * which on a portal somebody is actually using is often enough — and a poll on a
 * screen left open on the counter would be a request every few seconds, all
 * night, to find out that nothing had changed.
 *
 * <p>A popover rather than `role="menu"`: these are links and text, not a menu
 * of commands, and announcing them as menu items misrepresents them to a screen
 * reader.
 */
export function NotificationBell({ initialFeed }: { initialFeed: NotificationFeed }) {
  const [feed, setFeed] = React.useState(initialFeed);
  const [isOpen, setIsOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // The layout re-reads the feed on every navigation; without this the badge
  // would keep showing whatever it had when the bell first mounted.
  React.useEffect(() => {
    setFeed(initialFeed);
  }, [initialFeed]);

  const open = async () => {
    setIsOpen(true);

    // Marking read returns the feed it marked, so this is the refresh as well.
    const marked = await markNotificationsRead();
    if (marked) setFeed(marked);
  };

  // Escape closes and returns focus to the bell, which is where a keyboard user
  // expects to land — anything else strands them at the top of the document.
  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const unread = feed.unreadCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        // The count is in the accessible name, not only in the badge: a screen
        // reader user gets "Notifications, 3 unread" rather than "Notifications"
        // and no idea there is anything behind it.
        aria-label={
          unread === 0
            ? "Notifications"
            : `Notifications, ${unread} unread`
        }
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : void open())}
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas-subtle",
          isOpen && "bg-canvas-subtle text-ink",
        )}
      >
        <Bell aria-hidden className="size-5" />

        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-on-danger"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          // Right-aligned and width-capped: the bar is at the right edge of the
          // screen, and a panel that grew with its content would run off it.
          className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <p className="text-xs text-muted">
              {feed.items.length === 0
                ? "Nothing to report"
                : `${feed.items.length} ${feed.items.length === 1 ? "item" : "items"}`}
            </p>
          </div>

          {feed.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm leading-relaxed text-muted">
              Nothing needs attention. Stock warnings and voided sales appear
              here as they happen.
            </p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
              {feed.items.map((item) => (
                <li key={item.id}>
                  <NotificationRow item={item} onNavigate={() => setIsOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One row, as a link to the thing it is about.
 *
 * <p>A stock warning goes to the catalogue filtered to that product, so the next
 * click is the stock adjustment rather than a search. A voided sale goes to the
 * day it was rung up on, where the receipt and its reason are.
 */
function NotificationRow({
  item,
  onNavigate,
}: {
  item: Notification;
  onNavigate: () => void;
}) {
  const { Icon, tint } = presentation(item.kind);

  return (
    <Link
      href={hrefFor(item)}
      onClick={onNavigate}
      className="flex gap-3 px-4 py-3 transition-colors hover:bg-canvas-subtle"
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          tint,
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-sm font-medium text-ink">
            {item.title}
          </span>
          {item.unread ? (
            <span
              aria-label="Unread"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600"
            />
          ) : null}
        </span>

        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
          {item.detail}
        </span>
        <span className="mt-1 block text-[11px] text-placeholder">
          {relativeTime(item.occurredAt)}
        </span>
      </span>
    </Link>
  );
}

function presentation(kind: NotificationKind) {
  switch (kind) {
    case "OUT_OF_STOCK":
      return { Icon: PackageX, tint: "bg-danger-soft text-danger" };
    case "LOW_STOCK":
      return { Icon: TriangleAlert, tint: "bg-warning-soft text-warning" };
    case "SALE_VOIDED":
      return { Icon: Ban, tint: "bg-canvas-subtle text-ink-soft" };
  }
}

/**
 * Where a row leads.
 *
 * <p>Built here rather than sent by the API, because the route table is this
 * app's own. A stock alert searches the catalogue for the SKU in its detail
 * line — the id would be an exact filter, but the search box is what the
 * inventory screen actually reads from the URL.
 */
function hrefFor(item: Notification): string {
  if (item.entityType === "SALE") return routes.adminReportsDaily;

  const sku = item.detail.split(" ")[0];
  return `${routes.adminInventory}?q=${encodeURIComponent(sku)}`;
}

/**
 * "2 hours ago", for a timestamp that is usually recent.
 *
 * <p>Relative rather than absolute because these are read at a glance and
 * "yesterday" answers the question "is this still true" better than a date does.
 * Anything older than a week falls back to the date, where the relative form
 * stops being useful.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
