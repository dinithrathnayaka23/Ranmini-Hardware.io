"use client";

import { CalendarDays, ChevronDown, Download } from "lucide-react";
import * as React from "react";

import { Button, ButtonLink } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/app.config";

import type { ReportPeriod } from "../types/reports.types";

/**
 * Reporting period selector and the report actions.
 *
 * The period is a native `<select>` wearing a custom chevron rather than a
 * bespoke dropdown: the platform control already brings keyboard support,
 * type-ahead and the right picker on mobile.
 *
 * Changing the period currently only changes the label. Once the reporting
 * endpoints exist this should push the value into the URL as a search param so
 * the selection survives a refresh and can be linked to, and the page should
 * read its data from that param on the server.
 */
export function PeriodToolbar({
  periods,
  value,
  onChange,
}: {
  periods: ReportPeriod[];
  value: string;
  onChange: (value: string) => void;
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
          "Export PDF" is the browser's own print-to-PDF. That is a real export
          today with no backend and no PDF library, and it is why the layout
          carries print rules that strip the navigation chrome. A server-side
          renderer would give finer control over pagination later.
        */}
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Download aria-hidden className="size-4" />
          Export PDF
        </Button>

        <ButtonLink href={routes.adminReportsGenerate} size="sm">
          Generate Report
        </ButtonLink>
      </div>
    </div>
  );
}
