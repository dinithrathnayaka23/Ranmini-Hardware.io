"use client";

import { CalendarDays, FileDown } from "lucide-react";

import { SegmentedControl } from "@/shared/components/ui/segmented-control";

import type { ReportPeriod } from "../types/reports.types";

/**
 * Reporting period selector and the report actions.
 *
 * The period is a segmented control rather than a dropdown. There are only four
 * windows, and a dropdown hid three of them behind a click — showing them all
 * side by side makes switching from "Today" to "Last 7 Days" one tap, and makes
 * the window currently on screen readable without opening anything. On a phone
 * the row scrolls sideways instead of wrapping.
 *
 * The selection is pushed into the URL by the view above, so a reporting window
 * survives a refresh and can be linked to, and the page fetches for that range
 * on the server rather than filtering in the browser.
 */
export function PeriodToolbar({
  periods,
  value,
  onChange,
  exportHref,
}: {
  periods: readonly ReportPeriod[];
  value: string;
  onChange: (value: string) => void;
  /** Where "Export PDF" points — the same window the figures describe. */
  exportHref: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
        >
          <CalendarDays className="size-[18px]" />
        </span>

        <SegmentedControl
          label="Reporting period"
          options={periods}
          value={value}
          onChange={onChange}
          scrollable
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/*
          One button, not two. "Export PDF" used to be the browser's own print
          dialog and sat beside a "Generate Report" screen that was never
          designed — so the same request had two half-answers. It is now the
          server-rendered report: this window's figures, its chart, its category
          split, its best sellers and its day-by-day table, with the shop's
          letterhead on top.

          A link rather than a button, because the response is a file: a
          download has to be a navigation for the browser to save it under the
          filename the server chose.
        */}
        <a
          href={exportHref}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-on-brand transition-colors duration-150 hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
        >
          <FileDown aria-hidden className="size-4" />
          Export PDF
        </a>
      </div>
    </div>
  );
}
