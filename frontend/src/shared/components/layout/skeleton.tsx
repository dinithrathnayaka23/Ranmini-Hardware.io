import { cn } from "@/shared/lib/cn";

/**
 * A placeholder block shown while a screen's data is on its way.
 *
 * <p>The pulse is switched off under `prefers-reduced-motion`. A loading state
 * is exactly the kind of ambient, repeating animation that triggers discomfort
 * for people who ask the system to reduce motion, and the grey blocks still
 * read as "not ready yet" without it.
 *
 * <p>Marked `aria-hidden` wherever it is used: the shape of a screen that has
 * not arrived is meaningless read aloud, and the surrounding loading region
 * announces the wait once instead.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-line/70 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/**
 * The standard portal screen skeleton: a title block, a row of figures and a
 * panel.
 *
 * <p>Deliberately generic. It stands in for the dashboard, the inventory table
 * and the reports screen alike, and the point of it is to hold the layout still
 * so the page does not jump when the real content lands — not to mimic each
 * screen exactly, which would mean a bespoke skeleton to maintain per route.
 */
export function PortalPageSkeleton({
  /** Set false on screens with no figures above the content, like Staff. */
  showStats = true,
}: {
  showStats?: boolean;
}) {
  return (
    <div
      // Announced once, rather than letting a screen reader narrate a wall of
      // empty boxes.
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8"
    >
      <span className="sr-only">Loading…</span>

      <div aria-hidden className="space-y-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {showStats ? (
        <div
          aria-hidden
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="rounded-xl border border-line bg-surface p-5"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-7 w-32" />
              <Skeleton className="mt-3 h-3 w-28" />
            </div>
          ))}
        </div>
      ) : null}

      <div
        aria-hidden
        className="mt-5 overflow-hidden rounded-xl border border-line bg-surface"
      >
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="h-5 w-40" />
        </div>

        <div className="space-y-4 p-5">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-32 sm:block" />
              <Skeleton className="hidden h-4 w-24 md:block" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
