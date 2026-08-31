/**
 * The reporting windows the toolbar offers.
 *
 * The values are identifiers the view turns into a date range, not labels — a
 * period called "October 2023" would be wrong the moment the year turns, and a
 * shop reads this screen for "this month" far more often than for a named one.
 *
 * Everything else that used to live in this file was placeholder chart data. It
 * is gone: the reports screen now reads its figures from the API.
 */
export const reportPeriods = [
  { value: "this-month", label: "This Month" },
  { value: "today", label: "Today" },
  { value: "last-7", label: "Last 7 Days" },
  { value: "last-30", label: "Last 30 Days" },
] as const satisfies readonly { value: string; label: string }[];
