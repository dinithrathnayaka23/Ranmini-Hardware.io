"use client";

import { Bell, PackageX, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { popoverMotion } from "@/shared/components/ui/dialog-motion";

import { markTillAlertsRead } from "../actions";
import type { TillAlert, TillAlertFeed, TillAlertKind } from "../types/pos.types";

/**
 * The till's notification bell.
 *
 * <p>Deliberately not the portal's bell with a filter on it. Three things
 * differ, and each of them is the difference between a control somebody uses at
 * a counter and one they ignore:
 *
 * <ul>
 *   <li><b>The rows are not links.</b> A cashier has nowhere to go — there is
 *       no inventory screen for them to open, and a row that looks clickable and
 *       does nothing is worse than one that plainly does not.
 *   <li><b>Everything is bigger.</b> This is tapped with a thumb on a counter
 *       machine, often by somebody holding something in the other hand.
 *   <li><b>The copy is written for the person on the floor.</b> "Tell the owner"
 *       rather than "reorder", because reordering is not theirs to do.
 * </ul>
 *
 * <p>Opening the panel marks the feed read, in the same request that returns
 * it, so the badge and the rows change together rather than in two visible
 * steps.
 *
 * <p>Nothing polls. The feed is re-read on the server with every page load and
 * after every sale, which on a till is far more often than anything changes —
 * and a poll on a screen left open on the counter overnight is a request every
 * few seconds to learn that nothing has happened.
 */
export function TillAlertBell({ feed: initialFeed }: { feed: TillAlertFeed }) {
  const [feed, setFeed] = React.useState(initialFeed);
  const [isOpen, setIsOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // The page re-reads the feed after every sale; without this the badge would
  // keep showing whatever it had when the till was first opened — which on a
  // counter machine is once, at eight in the morning.
  React.useEffect(() => {
    setFeed(initialFeed);
  }, [initialFeed]);

  const open = async () => {
    setIsOpen(true);

    // Marking read returns the feed it marked, so this is the refresh as well.
    const marked = await markTillAlertsRead();
    if (marked) setFeed(marked);
  };

  // Escape closes and returns focus to the bell. A keyboard user left at the
  // top of the document would have to tab back through the whole product grid.
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
  const count = feed.items.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        // The count belongs in the accessible name, not only in the badge: a
        // screen-reader user otherwise hears "Stock alerts" with no hint that
        // there is anything behind it.
        aria-label={unread === 0 ? "Stock alerts" : `Stock alerts, ${unread} new`}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : void open())}
        className={cn(
          // Larger than the portal's bell: this is a touch target on a counter.
          "relative inline-flex size-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas-subtle",
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

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            {...popoverMotion}
            // Grows out of the button it belongs to, at the top right.
            style={{ transformOrigin: "top right" }}
            // Right-aligned and width-capped: the bell sits at the right edge of
            // the top bar, and a panel that grew with its content would run off
            // the screen on the narrow terminal the shop actually uses.
            className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-raised"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">Stock alerts</p>
              <p className="text-xs text-muted">
                {count === 0 ? "All clear" : `${count} ${count === 1 ? "line" : "lines"}`}
              </p>
            </div>

            {count === 0 ? (
              <p className="px-4 py-8 text-center text-sm leading-relaxed text-muted">
                Nothing is running low. Lines that run out, or reach the level the
                shop reorders at, appear here.
              </p>
            ) : (
              <>
                <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
                  {feed.items.map((item) => (
                    <li key={item.id}>
                      <AlertRow item={item} />
                    </li>
                  ))}
                </ul>

                {/* The one thing a cashier can actually do about any of this. */}
                <p className="border-t border-line bg-canvas-subtle px-4 py-2.5 text-xs leading-relaxed text-muted">
                  Let the owner know so these can be reordered.
                </p>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** One line, as a statement rather than a link — there is nowhere for it to go. */
function AlertRow({ item }: { item: TillAlert }) {
  const { Icon, tint } = presentation(item.kind);

  return (
    <div className="flex gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          tint,
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm font-medium text-ink">{item.title}</p>
          {item.unread ? (
            <span
              aria-label="New"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600"
            />
          ) : null}
        </div>

        <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.detail}</p>
      </div>
    </div>
  );
}

function presentation(kind: TillAlertKind) {
  switch (kind) {
    case "OUT_OF_STOCK":
      return { Icon: PackageX, tint: "bg-danger-soft text-danger" };
    case "LOW_STOCK":
      return { Icon: TriangleAlert, tint: "bg-warning-soft text-warning" };
  }
}
