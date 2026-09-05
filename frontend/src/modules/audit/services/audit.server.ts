import "server-only";

import { apiFetch, type PageResponse } from "@/shared/lib/api.server";

import type { AuditEntry, AuditPage } from "../types/audit.types";

/**
 * Reading the audit log.
 *
 * <p>Never cached. The whole point of opening this panel is to see what has
 * happened, and a cached answer is the one thing it must not give.
 *
 * <p>A failure returns an empty page rather than throwing. The log sits at the
 * bottom of the Security settings screen, and an audit outage must not stop
 * somebody changing their lockout threshold.
 */
export async function fetchAuditLog(page: number, size = 20): Promise<AuditPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });

  try {
    const response = await apiFetch<PageResponse<AuditEntry>>(
      `/api/v1/audit?${params}`,
      { cache: "no-store" },
    );

    return {
      entries: response.content,
      page: response.page,
      totalEntries: response.totalEntries,
      totalPages: response.totalPages,
    };
  } catch {
    return { entries: [], page: 1, totalEntries: 0, totalPages: 0 };
  }
}
