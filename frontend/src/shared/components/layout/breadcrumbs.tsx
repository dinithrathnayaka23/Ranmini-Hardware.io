"use client";

import { ChevronRight, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildBreadcrumbs } from "@/shared/config/breadcrumbs";
import { cn } from "@/shared/lib/cn";

/**
 * Where you are in the portal, and the way back up.
 *
 * <p>Rendered as an ordered list inside a labelled `nav`, which is what screen
 * readers announce as a breadcrumb — a row of links separated by chevrons is
 * visually a trail but semantically just links, and the difference is whether
 * the structure is available to somebody who cannot see it.
 *
 * <p>The separators are decorative: they carry no meaning that the list
 * structure does not already, so they are hidden rather than read out as
 * "greater-than" between every step.
 *
 * <p><b>The last crumb is not a link.</b> It is the page you are already on,
 * and a link that goes nowhere is a small lie every time somebody clicks it.
 * It carries `aria-current="page"` instead.
 */
export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isHome = index === 0;

          return (
            <li
              key={crumb.href}
              className={cn(
                "flex min-w-0 items-center gap-1",
                // Below `sm` only the current page is shown. The full trail
                // would either overflow the bar or squeeze the account menu off
                // it, and on a phone the one thing worth the space is the name
                // of the screen you are looking at.
                !isLast && "hidden sm:flex",
              )}
            >
              {!isHome && (
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-placeholder"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="flex min-w-0 items-center gap-1.5 font-medium text-ink"
                >
                  {isHome && <House aria-hidden className="size-4 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="flex min-w-0 items-center gap-1.5 rounded text-muted transition-colors hover:text-ink"
                >
                  {isHome && <House aria-hidden className="size-4 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
