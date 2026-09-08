import type { LucideIcon } from "lucide-react";

import { accentChip } from "@/shared/lib/accent";
import { cn } from "@/shared/lib/cn";

/**
 * Title block for an unauthenticated screen.
 *
 * <p>Every screen in the `(auth)` group opens the same way — an optional badge,
 * a heading, a supporting line — and until now each one spelled out the same
 * four typography classes for itself. Four copies of a heading style is three
 * opportunities for them to drift, and the sign-in screen and the expired-link
 * screen sitting a pixel apart in size is the kind of difference nobody reports
 * but everybody feels.
 *
 * <h4>The badge</h4>
 *
 * <p>It says which door the visitor is standing at. The two sign-in screens are
 * otherwise near-identical — the same form, the same photograph, headings that
 * differ by one word — and since the portals started rejecting each other's
 * accounts, arriving at the wrong one is a real mistake with a real error
 * message at the end of it. A labelled badge answers "am I in the right place?"
 * before any credentials are typed rather than after.
 */
export function AuthHeading({
  badge,
  title,
  description,
  className,
}: {
  badge?: { icon: LucideIcon; label: string };
  title: string;
  description?: string;
  className?: string;
}) {
  const BadgeIcon = badge?.icon;

  return (
    <div className={className}>
      {badge && BadgeIcon ? (
        <span
          className={cn(
            "mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            accentChip.brand,
          )}
        >
          <BadgeIcon aria-hidden className="size-3.5 shrink-0" />
          {badge.label}
        </span>
      ) : null}

      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-ink sm:text-[2rem]">
        {title}
      </h1>

      {description ? (
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
