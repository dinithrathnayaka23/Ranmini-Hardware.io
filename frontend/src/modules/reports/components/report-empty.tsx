import { CalendarOff } from "lucide-react";

/**
 * What a report panel shows when the chosen period has no sales.
 *
 * <p>A quiet day, a month that has just started, or a range picked before the
 * shop opened are all ordinary — not errors, and not something to hide. Each
 * panel says so in its own words rather than rendering an empty chart, which
 * reads as broken, or crashing, which is what the category donut used to do.
 */
export function ReportEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-canvas-subtle text-muted"
      >
        <CalendarOff className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">No sales in this period</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{message}</p>
    </div>
  );
}
