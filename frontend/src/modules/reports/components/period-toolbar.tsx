"use client";

import { CalendarDays, ChevronDown, FileDown } from "lucide-react";
import * as React from "react";

import type { ReportPeriod } from "../types/reports.types";

/**
 * Reporting period selector and the report actions.
 *
 * The period is a native `<select>` wearing a custom chevron rather than a
 * bespoke dropdown: the platform control already brings keyboard support,
 * type-ahead and the right picker on mobile.
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

        <div className="relative flex min-w-0 items-center">
          <select
            aria-label="Reporting period"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full appearance-none bg-transparent pr-8 text-[0.95rem] font-semibold tracking-tight text-ink focus:outline-none"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-2 size-4 text-muted"
          />
        </div>
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
