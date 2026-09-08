import type { LucideIcon } from "lucide-react";

import {
  accentBar,
  accentBorder,
  accentChip,
  accentText,
  type Accent,
} from "@/shared/lib/accent";
import { cn } from "@/shared/lib/cn";

/**
 * Headline figure card, used by every overview screen in the portal.
 *
 * The colour decisions are handed in rather than derived, because the right
 * accent is a business judgement the data source owns: a rise in sales is
 * good, a rise in out-of-stock lines is not, and the card cannot know which.
 *
 * <h4>How it is composed</h4>
 *
 * <p><b>The figure is the loudest thing on it.</b> The label above it is small,
 * muted and lettered wide, so that a row of four cards reads as four numbers
 * with captions rather than four headings with numbers underneath. Scanning the
 * day's takings should not require reading a word.
 *
 * <p><b>One accent, used three times.</b> A hairline along the top edge, the
 * icon tile, and the caption pill all take the same colour, which is what makes
 * the card look composed rather than decorated. The accent never touches the
 * figure itself unless `valueAccent` says so — a number is only coloured when
 * the number is the problem.
 *
 * <p><b>Elevation, not ornament.</b> A resting shadow barely there, and a
 * slightly stronger one under the pointer. That is the entire animation budget:
 * a shop-floor dashboard that moves when you sweep the mouse across it is
 * tiring to work in front of all day.
 */
export interface StatCardModel {
  id: string;
  label: string;
  /** Pre-formatted for display — formatting belongs to the data source. */
  value: string;
  icon: LucideIcon;
  /** Fill of the icon chip. */
  accent: Accent;
  /** Tint the label with the accent too. Off by default, so labels read as text. */
  labelAccent?: boolean;
  /** Colour the figure itself — reserve for a number that is itself a problem. */
  valueAccent?: Accent;
  /** Caption under the figure. The icon is optional: not every caption is a trend. */
  caption?: {
    label: string;
    accent: Accent;
    icon?: LucideIcon;
  };
  /** Tinted border, for the one figure that needs attention today. */
  outlined?: boolean;
}

export function StatCard({ stat }: { stat: StatCardModel }) {
  const { icon: Icon, caption } = stat;
  const CaptionIcon = caption?.icon;

  return (
    <article
      className={cn(
        // `relative` and `overflow-hidden` are load-bearing: they are what let
        // the accent hairline below sit flush in the rounded top corners
        // instead of poking out of them.
        "relative overflow-hidden rounded-xl border bg-surface p-5 shadow-card",
        "transition-shadow duration-150 hover:shadow-raised",
        stat.outlined ? accentBorder[stat.accent] : "border-line",
      )}
    >
      {/* The accent hairline. Decorative — every meaning it carries is also in
          the label, the figure and the caption. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-0.5",
          accentBar[stat.accent],
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={cn(
              // 12px rather than the 11px this pattern usually gets: the
              // dashboard is read at arm's length on a counter machine, and
              // wide-tracked uppercase is already the hardest thing on the card
              // to read. Below this it stops being a label and becomes texture.
              "truncate text-[0.75rem] font-semibold tracking-[0.08em] uppercase",
              stat.labelAccent ? accentText[stat.accent] : "text-muted",
            )}
          >
            {stat.label}
          </h3>

          <p
            className={cn(
              // `tabular-nums` so four cards in a row do not jitter their digits
              // against each other when the figures refresh.
              "mt-2.5 text-[1.8rem] leading-none font-bold tracking-tight tabular-nums",
              stat.valueAccent ? accentText[stat.valueAccent] : "text-ink",
            )}
          >
            {stat.value}
          </p>
        </div>

        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accentChip[stat.accent],
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>

      {caption ? (
        // A pill rather than loose text: it gives the caption a boundary, which
        // matters on the one card where the caption is the warning.
        <p
          className={cn(
            "mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium",
            accentChip[caption.accent],
          )}
        >
          {CaptionIcon ? (
            <CaptionIcon aria-hidden className="size-3.5 shrink-0" />
          ) : null}
          <span className="truncate">{caption.label}</span>
        </p>
      ) : null}
    </article>
  );
}

export function StatCardGrid({ stats }: { stats: StatCardModel[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
