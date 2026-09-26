import { CalendarOff } from "lucide-react";

import { EmptyState } from "@/shared/components/ui/empty-state";

/**
 * What a report panel shows when the chosen period has no sales.
 *
 * <p>A quiet day, a month that has just started, or a range picked before the
 * shop opened are all ordinary — not errors, and not something to hide. Each
 * panel says so in its own words rather than rendering an empty chart, which
 * reads as broken, or crashing, which is what the category donut used to do.
 *
 * <p>A thin wrapper over the shared {@link EmptyState} now that the portal has
 * one. It is kept as its own component because four report panels share the same
 * heading and the same icon, and only the sentence underneath differs — the
 * wrapper is what stops that agreement drifting apart one panel at a time.
 */
export function ReportEmpty({ message }: { message: string }) {
  return (
    <EmptyState
      icon={CalendarOff}
      title="No sales in this period"
      message={message}
      // A report panel sits beside two or three others, so it gets the compact
      // proportions rather than a screen's worth of empty space.
      size="sm"
    />
  );
}
