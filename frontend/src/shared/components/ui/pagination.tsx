"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/shared/lib/cn";

/**
 * Page navigator for server-paged tables.
 *
 * <p><b>The page number lives in the URL</b>, which is what makes this work at
 * all: every screen that uses it already reads `?page=` on the server and
 * fetches that page, so navigating is a link, not a state change. That also
 * means a particular page can be bookmarked, opened in a new tab with a
 * middle-click, and reached with the back button — none of which a button
 * wired to a click handler would give.
 *
 * <p>It was previously rendered with every control disabled, on the reasoning
 * that paging had to happen on the server and the endpoint did not accept a
 * page parameter yet. It has for some time, and the screens have been passing
 * real totals in all along — so the effect was a control that displayed the
 * right number of pages and refused to visit any of them.
 *
 * <p>Every caller names its page parameter `page`, so that is not configurable
 * here. A screen that ever needs two independent lists would need a second
 * name, and this is the place to add it.
 */
export function Pagination({
  page,
  totalPages,
  className,
}: {
  page: number;
  totalPages: number;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // One page is not a choice, so there is nothing to navigate.
  if (totalPages <= 1) return null;

  /**
   * The address of one page, keeping every other filter the user has set.
   *
   * <p>Rebuilt from the current query string rather than assembled from known
   * keys: the inventory table carries a search term and a status filter, and
   * paging past either of them would silently widen the result set the user is
   * looking at.
   *
   * <p>Page one drops the parameter instead of writing `?page=1`, so the first
   * page has one address rather than two.
   */
  const hrefFor = (target: number): string => {
    const params = new URLSearchParams(searchParams);

    if (target <= 1) params.delete("page");
    else params.set("page", String(target));

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const entries = buildPageList(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <Step
        href={page > 1 ? hrefFor(page - 1) : null}
        label="Previous page"
        icon={<ChevronLeft aria-hidden className="size-4" />}
      />

      {entries.map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="px-1 text-sm text-muted"
          >
            …
          </span>
        ) : entry === page ? (
          // The page already being read is not a link to anywhere.
          <span
            key={entry}
            aria-current="page"
            aria-label={`Page ${entry}, current page`}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-brand-600 px-2 text-sm font-medium text-on-brand"
          >
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            aria-label={`Page ${entry}`}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-muted transition-colors hover:bg-canvas-subtle hover:text-ink"
          >
            {entry}
          </Link>
        ),
      )}

      <Step
        href={page < totalPages ? hrefFor(page + 1) : null}
        label="Next page"
        icon={<ChevronRight aria-hidden className="size-4" />}
      />
    </nav>
  );
}

/**
 * Previous or next.
 *
 * <p>A link when there is somewhere to go and a disabled button at the ends,
 * rather than a link to the page you are already on. The two ends of a list are
 * the places a user clicks fastest, and one that quietly reloads the same rows
 * reads as the control being broken.
 */
function Step({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  const shape =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors";

  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className={cn(shape, "cursor-not-allowed text-muted opacity-50")}
      >
        {icon}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(shape, "text-muted hover:bg-canvas-subtle hover:text-ink")}
    >
      {icon}
    </Link>
  );
}

/**
 * Condenses a long page range into the familiar `1 2 3 … 2490` shape.
 *
 * Always keeps the first and last page reachable, plus a window around the
 * current one, so a user on page 1,200 is never more than two clicks from
 * either end.
 */
function buildPageList(page: number, totalPages: number): (number | "gap")[] {
  const MAX_NUMBERED = 5;
  if (totalPages <= MAX_NUMBERED) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const windowStart = Math.max(1, Math.min(page - 1, totalPages - 3));
  const windowEnd = Math.min(totalPages - 1, windowStart + 2);

  const entries: (number | "gap")[] = [];
  for (let current = windowStart; current <= windowEnd; current += 1) {
    entries.push(current);
  }

  if (windowStart > 1) entries.unshift("gap", 1);
  if (windowEnd < totalPages - 1) entries.push("gap");
  entries.push(totalPages);

  return entries;
}
