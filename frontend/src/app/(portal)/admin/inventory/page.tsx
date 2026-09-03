import { Network, Plus } from "lucide-react";
import type { Metadata } from "next";

import { InventoryTable } from "@/modules/inventory/components/inventory-table";
import {
  fetchInventoryPage,
  fetchInventoryStats,
} from "@/modules/inventory/services/inventory.server";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { StatCardGrid } from "@/shared/components/ui/stat-card";
import { routes } from "@/shared/config/app.config";

import type { StockStatus } from "@/modules/inventory/types/inventory.types";

export const metadata: Metadata = {
  title: "Inventory",
};

/**
 * `/admin/inventory` — product catalogue, stock levels and pricing.
 *
 * <p>The page number and the search term live in the URL rather than in
 * component state, so a shopkeeper can bookmark or share a filtered view, and
 * the back button behaves. It also means the search runs against the backend's
 * text index instead of filtering a page of rows that were already sent.
 */
export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  // Narrowed against a closed set before it reaches the API. The value comes
  // from the URL, which anybody can type, and an unknown status should show the
  // whole catalogue rather than produce a rejected request.
  const status = isStockStatus(params.status) ? params.status : "ALL";
  const query = params.q?.trim() ?? "";

  // Independent reads, so they run together rather than adding a round trip.
  const [stats, inventory] = await Promise.all([
    fetchInventoryStats(),
    fetchInventoryPage(page, query, status === "ALL" ? undefined : status),
  ]);

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Inventory Management"
        description="Search the catalogue, record stock movements, and update pricing."
        actions={
          <>
            <ButtonLink
              href={routes.adminInventoryCategories}
              variant="secondary"
              size="sm"
            >
              <Network aria-hidden className="size-4" />
              Manage Categories
            </ButtonLink>
            <ButtonLink href={routes.adminInventoryNew} size="sm">
              <Plus aria-hidden className="size-4" />
              Add New Product
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6">
        <StatCardGrid stats={stats} />
      </div>

      <div className="mt-5">
        <InventoryTable
          products={inventory.products}
          meta={inventory.meta}
          query={query}
          status={status}
        />
      </div>
    </div>
  );
}

/** Whether a URL parameter names a stock state the API knows. */
function isStockStatus(value: string | undefined): value is StockStatus {
  return value === "IN_STOCK" || value === "LOW_STOCK" || value === "OUT_OF_STOCK";
}
