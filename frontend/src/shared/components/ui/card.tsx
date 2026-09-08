import * as React from "react";

import { cn } from "@/shared/lib/cn";

/**
 * Card chrome shared by every dashboard panel.
 *
 * Split into Card / CardHeader / CardBody rather than a single component with
 * a dozen props: the panels differ enough (a tinted alert header, a plain
 * header with an action, no header at all) that composition stays clearer than
 * configuration.
 *
 * <p><b>A hairline border and a shadow you would not notice on its own.</b>
 * Either alone is weaker than it sounds: a border with no shadow leaves cards
 * looking like boxes drawn on the page, and a shadow with no border disappears
 * entirely in the dark theme, where a soft black blur over a dark ground is
 * nothing at all. Together they read as a raised surface in both palettes,
 * which is the only reason both are here.
 */
export function Card({
  interactive = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Lifts the card under the pointer.
   *
   * <p>Off by default, and it should stay off for the great majority of panels.
   * A card that responds to the mouse is making a promise that clicking it does
   * something; on a panel that merely displays figures, that promise is a small
   * lie the user discovers by clicking.
   */
  interactive?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card",
        interactive &&
          "transition-shadow duration-150 hover:border-line-strong hover:shadow-raised",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

type HeaderTone = "default" | "danger";

const headerToneStyles: Record<HeaderTone, string> = {
  // Faintly recessed rather than flush with the body. The dividing rule alone
  // was doing all the work of separating a title from the table under it, and
  // one hairline among a table full of hairlines is not enough to land.
  default: "border-line bg-canvas-subtle/60",
  // A tinted header carries the urgency of the panel without needing a badge.
  danger: "border-danger/20 bg-danger-soft",
};

export function CardHeader({
  tone = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: HeaderTone }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4",
        headerToneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 flex-1 p-5", className)} {...props}>
      {children}
    </div>
  );
}
