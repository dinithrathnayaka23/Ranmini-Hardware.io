import { ListFilter } from "lucide-react";

import { Card, CardBody, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";

import type { ActivityEntry } from "../types/dashboard.types";

/**
 * Chronological feed of notable events.
 *
 * From `lg` entries alternate either side of a centre line; below that they
 * stack against a single left-hand rail, because an alternating layout in a
 * narrow column leaves both sides too cramped to read.
 */
export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <button
          type="button"
          aria-label="Filter activity"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas-subtle hover:text-ink-soft"
        >
          <ListFilter aria-hidden className="size-[18px]" />
        </button>
      </CardHeader>

      <CardBody>
        <ol className="relative space-y-6">
          {/* The connecting rail. Decorative, so it is hidden from the
              accessibility tree — the ordered list already conveys sequence. */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-4 w-px bg-line lg:left-1/2"
          />

          {entries.map((entry, index) => (
            <ActivityRow key={entry.id} entry={entry} index={index} />
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

function ActivityRow({
  entry,
  index,
}: {
  entry: ActivityEntry;
  index: number;
}) {
  const { icon: Icon, tone } = entry;
  // Alternate sides so consecutive entries are easy to tell apart at a glance.
  const isTrailingSide = index % 2 === 0;

  return (
    <li className="relative pl-12 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:pl-0">
      <span
        aria-hidden
        className={cn(
          "absolute left-0 flex size-8 items-center justify-center rounded-full lg:left-1/2 lg:-translate-x-1/2",
          tone === "brand"
            ? "bg-brand-600 text-on-brand"
            : "bg-brand-100 text-brand-700",
        )}
      >
        <Icon className="size-4" />
      </span>

      <div
        className={cn(
          "rounded-lg px-4 py-3",
          tone === "brand" ? "bg-brand-50" : "bg-canvas-subtle",
          isTrailingSide
            ? "lg:col-start-2"
            : "lg:col-start-1 lg:row-start-1 lg:text-right",
        )}
      >
        <p
          className={cn(
            "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm",
            !isTrailingSide && "lg:justify-end",
          )}
        >
          <span
            className={cn(
              "font-semibold",
              tone === "brand" ? "text-brand-700" : "text-ink",
            )}
          >
            {entry.title}
          </span>
          <span className="text-xs text-muted">{entry.timeAgo}</span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {entry.description}
        </p>
      </div>
    </li>
  );
}
