import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

/**
 * What a panel shows when it has nothing to list.
 *
 * <p><b>Why one component and not a sentence per screen.</b> Six screens had
 * grown their own answer to the same question. The reports panels and the till's
 * catalogue had the considered version — an icon, a heading and a line of
 * explanation — while the catalogue table, the audit log and the category list
 * had a lone grey sentence floating in white space, and the dashboard's low-stock
 * panel had nothing at all: a table header with no rows under it, which reads as
 * a panel that failed to load rather than as good news. Emptiness is a state the
 * portal shows constantly — a fresh install has an empty everything — so it is
 * worth designing once.
 *
 * <p><b>It says what to do next, not just that there is nothing.</b> "No
 * products match this search" is a dead end; the same line plus "clear the
 * filter" is a way out. The `message` carries that, and `action` carries it as a
 * control where one exists.
 *
 * <p><b>The icon is decorative.</b> It is `aria-hidden`, and the heading and
 * message carry the whole meaning, so nothing depends on recognising a glyph.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  /** One short line: what is absent. */
  title: string;
  /** Why, and what would change it. Optional where the title says everything. */
  message?: React.ReactNode;
  /** A control that resolves the emptiness — "Add a product", "Clear filters". */
  action?: React.ReactNode;
  /**
   * `md` for a screen's main panel; `sm` inside something already small — a
   * report card beside three others, or a popover.
   */
  size?: "sm" | "md";
  className?: string;
}) {
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        isSmall ? "py-12" : "py-16",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex items-center justify-center rounded-full bg-canvas-subtle text-muted",
          isSmall ? "size-11" : "size-12",
        )}
      >
        <Icon className={isSmall ? "size-5" : "size-6"} />
      </span>

      <p className={cn("font-medium text-ink", isSmall ? "mt-3 text-sm" : "mt-4 text-sm")}>
        {title}
      </p>

      {message ? (
        // Capped in width rather than left to run the width of the panel. A
        // centred line of explanation stretched across 1200px of table is
        // harder to read than the same words in two.
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{message}</p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
