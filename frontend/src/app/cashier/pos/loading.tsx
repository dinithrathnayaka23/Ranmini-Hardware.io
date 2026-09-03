import { Skeleton } from "@/shared/components/layout/skeleton";

/**
 * What the till shows while its catalogue is loading.
 *
 * <p>This one earns its place more than the portal's does. The till fetches the
 * session, the categories and a hundred products before it can render, and
 * nothing above it in the tree awaits anything — so this streams to the browser
 * immediately on a cold open and the cashier sees the counter appear rather
 * than a white page.
 *
 * <p>It traces the real terminal: a fixed top bar, a wide catalogue column and
 * the order panel beside it from `md`. Matching the shape is what stops the
 * screen lurching when the products arrive, which on a touch screen is the
 * difference between a tap landing on a card and landing on whatever replaced
 * it.
 */
export default function PosLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-dvh flex-col overflow-hidden"
    >
      <span className="sr-only">Preparing the till…</span>

      {/* -------------------------------- Top bar ------------------------------ */}
      <div
        aria-hidden
        className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-3 py-3 sm:px-4"
      >
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      <div aria-hidden className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ------------------------------ Catalogue ---------------------------- */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 border-b border-line bg-canvas-subtle p-3 sm:p-4">
            <div className="max-w-5xl space-y-3">
              <Skeleton className="h-12 w-full rounded-[10px]" />
              <div className="flex gap-2 overflow-hidden">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Skeleton key={index} className="h-8 w-28 shrink-0 rounded-full" />
                ))}
              </div>
            </div>
          </div>

          {/* The same auto-fill grid the real catalogue uses, so the number of
              placeholder cards follows the width actually available rather than
              a breakpoint's guess at it. */}
          <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
            <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-line bg-surface"
                >
                  <Skeleton className="aspect-4/3 w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------- Order panel --------------------------- */}
        <aside className="hidden bg-surface md:flex md:w-[clamp(20rem,40%,32rem)] md:shrink-0 md:flex-col md:border-l md:border-line">
          <div className="border-b border-line px-4 py-4">
            <Skeleton className="h-5 w-32" />
          </div>

          <div className="flex-1 space-y-4 p-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-line p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-13 w-full rounded-[10px]" />
          </div>
        </aside>
      </div>
    </div>
  );
}
