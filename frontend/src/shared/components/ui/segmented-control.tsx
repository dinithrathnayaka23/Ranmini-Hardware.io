"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

/*
 * Adapted from the UI Layouts "Tabs" component (MIT) — see THIRD_PARTY_NOTICES.md.
 *
 * What was kept is the idea that makes it worth having: one highlight shared by
 * every option through Motion's `layoutId`, so choosing another option slides
 * the highlight across instead of switching it off in one place and on in
 * another. The eye follows the movement, and that makes it obvious which option
 * just took effect.
 *
 * What was dropped is the "wobbly" mode, the hover-to-select mode and the
 * animated content panels. A second highlight trailing the first looks lively in
 * a demo and reads as lag at a till, and selecting on hover would change the
 * payment method when a cashier's hand merely passed over it.
 */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

type Tone = "neutral" | "brand";
type Size = "sm" | "md" | "lg";

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
  // Counter-sized: the till's payment toggle is pressed by a finger.
  lg: "h-11 px-4 text-sm @min-[28rem]:h-12",
};

/**
 * A row of mutually exclusive options with a sliding highlight.
 *
 * <p><b>Buttons carrying `aria-pressed`, inside a labelled group,</b> rather
 * than a tab list or a radio group. These filter or configure something already
 * on screen, so announcing tabs would promise panels that do not exist, and a
 * radio group would demand arrow keys where a cashier expects to press a button.
 *
 * <p><b>Two tones.</b> Neutral lifts the chosen option onto a white card, which
 * suits filters that sit quietly in a toolbar. Brand fills it with the accent,
 * for a choice with consequences — on the till, the payment method — where the
 * selection must be readable from a step away.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "neutral",
  size = "md",
  fullWidth = false,
  scrollable = false,
  className,
}: {
  /** Accessible name for the group; not rendered. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: Tone;
  size?: Size;
  /** Share the width equally between options, for a pair like Cash / Card. */
  fullWidth?: boolean;
  /**
   * Scroll sideways instead of wrapping. For a list whose length the shop
   * decides — the till's categories — where a second row would steal height
   * from the product grid.
   */
  scrollable?: boolean;
  className?: string;
}) {
  // One highlight per control. Two controls sharing an id would pass the
  // highlight between them, sliding it across the page.
  const highlightId = React.useId();

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "relative flex gap-1 rounded-[10px] border border-line bg-canvas-subtle p-1",
        fullWidth ? "w-full" : "w-fit max-w-full",
        scrollable &&
          "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex touch-manipulation items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none",
              "transition-colors duration-150",
              sizeStyles[size],
              // Full width shares the row equally and may shrink, so a long
              // label ellipsises inside its own half instead of pushing the
              // page sideways on a phone. Otherwise options keep their natural
              // width, and a scrollable row scrolls.
              fullWidth ? "min-w-0 flex-1 basis-0" : "shrink-0",
              isActive
                ? tone === "brand"
                  ? "text-on-brand"
                  : "text-ink"
                : "text-muted hover:text-ink",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={highlightId}
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-lg",
                  tone === "brand"
                    ? "bg-brand-600 shadow-sm"
                    : "border border-line bg-surface shadow-card",
                )}
              />
            ) : null}

            {/* Above the highlight, which is absolutely positioned beneath. */}
            <span className="relative z-10 inline-flex min-w-0 items-center gap-2">
              {Icon ? <Icon aria-hidden className="size-[18px] shrink-0" /> : null}
              <span className="truncate">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
