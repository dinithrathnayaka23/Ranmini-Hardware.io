import type { LucideIcon } from "lucide-react";

import {
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
        "rounded-xl border bg-surface p-5",
        stat.outlined ? accentBorder[stat.accent] : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={cn(
            "text-[0.95rem] font-semibold",
            stat.labelAccent ? accentText[stat.accent] : "text-ink",
          )}
        >
          {stat.label}
        </h3>
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            accentChip[stat.accent],
          )}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>

      <p
        className={cn(
          "mt-3 text-[1.75rem] leading-none font-bold tracking-tight",
          stat.valueAccent ? accentText[stat.valueAccent] : "text-ink",
        )}
      >
        {stat.value}
      </p>

      {caption ? (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 text-[0.8rem]",
            accentText[caption.accent],
          )}
        >
          {CaptionIcon ? (
            <CaptionIcon aria-hidden className="size-4 shrink-0" />
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
