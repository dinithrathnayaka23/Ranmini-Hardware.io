/**
 * Reports & analytics view model.
 *
 * Describes what the charts and tables render, not the backend's storage
 * shape. When the Spring Boot reporting endpoints land, map their responses
 * onto these types in a service module so the components stay untouched.
 */

/** A selectable reporting window. */
export interface ReportPeriod {
  /** Value sent to the backend, e.g. "2023-10". */
  value: string;
  /** What the toolbar shows, e.g. "This Month (October 2023)". */
  label: string;
}

/** One point on the sales trend line. */
export interface SalesPoint {
  /** ISO date — the x value. */
  date: string;
  /** Short axis label, e.g. "Oct 4". */
  label: string;
  /** Revenue for that day, in the store's base currency. */
  revenue: number;
}

/** One slice of the category distribution. */
export interface CategoryShare {
  id: string;
  label: string;
  /** Share of revenue as a fraction of 1, e.g. 0.45. */
  share: number;
  /**
   * CSS custom property reference, not a raw hex.
   *
   * Series colours are assigned from the categorical palette in a fixed order
   * and never cycled — the ordering is what keeps adjacent slices separable
   * for colour-blind readers, so a slice must not pick its own colour.
   */
  color: string;
}

/** A row in the top-selling products meter list. */
export interface TopProduct {
  id: string;
  name: string;
  unitsSold: number;
}

/** A row in the daily summary table. */
export interface DailySummaryRow {
  date: string;
  /** Pre-formatted display date, e.g. "Oct 24, 2023". */
  label: string;
  transactions: number;
  revenue: number;
  profit: number;
  /** Whether the day moved up or down against the one before it. */
  trend: "up" | "down";
}
