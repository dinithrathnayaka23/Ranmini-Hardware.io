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
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  // Independent reads, so they run together rather than adding a round trip.
  const [stats, inventory] = await Promise.all([
    fetchInventoryStats(),
    fetchInventoryPage(page, params.q),
  ]);

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Inventory Management"
        description="Manage products, monitor stock levels, and update pricing."
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
        <InventoryTable products={inventory.products} meta={inventory.meta} />
      </div>
    </div>
  );
}
