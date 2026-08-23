import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/cn";

/**
 * Page navigator for server-paged tables.
 *
 * NOT YET WIRED. Paging has to happen on the server — the client only ever
 * holds one page of rows — so until the inventory endpoint accepts a page
 * parameter there is nowhere for these controls to go. Every target other than
 * the current page is therefore genuinely disabled rather than rendered as a
 * live control that silently does nothing.
 *
 * To activate: pass an `onPageChange` handler and drop the `disabled` guard.
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
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <PageButton disabled label="Previous page">
        <ChevronLeft aria-hidden className="size-4" />
      </PageButton>

      {buildPageList(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="px-1 text-sm text-muted"
          >
            …
          </span>
        ) : (
          <PageButton
            key={entry}
            isCurrent={entry === page}
            disabled={entry !== page}
            label={`Page ${entry}`}
          >
            {entry}
          </PageButton>
        ),
      )}

      <PageButton disabled label="Next page">
        <ChevronRight aria-hidden className="size-4" />
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  label,
  isCurrent = false,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  isCurrent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors",
        isCurrent
          ? "bg-brand-600 font-medium text-white"
          : "text-muted enabled:hover:bg-canvas-subtle enabled:hover:text-ink",
        disabled && "cursor-not-allowed",
      )}
    >
      {children}
    </button>
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
