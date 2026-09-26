/**
 * Contract between the import screen and the backend's import endpoints.
 */

export interface ImportRowError {
  /** The spreadsheet line the problem is on, counting the heading as line 1. */
  line: number;
  message: string;
}

/** What an import would do. Nothing has been written when this is returned. */
export interface ImportPreview {
  rows: number;
  toCreate: number;
  toUpdate: number;
  /** Existing products the file would leave exactly as they are; not written. */
  unchanged: number;
  /** Rows that cannot be imported; the first 200 are listed in `errors`. */
  skipped: number;
  newCategories: string[];
  errors: ImportRowError[];
}

export type ImportState = "PENDING" | "RUNNING" | "DONE" | "FAILED";

/** A running or finished import. */
export interface ImportJob {
  id: string;
  state: ImportState;
  total: number;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  categoriesCreated: string[];
  /** Rows that lost a race: their SKU was created by someone else mid-import. */
  conflicts: ImportRowError[];
  failure: string | null;
}

/** The largest file the backend accepts. */
export const MAX_IMPORT_BYTES = 12 * 1024 * 1024;
