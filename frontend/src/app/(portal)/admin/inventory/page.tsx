import { Network, Plus } from "lucide-react";
import type { Metadata } from "next";

import { InventoryTable } from "@/modules/inventory/components/inventory-table";
import {
  inventoryStats,
  pageMeta,
  products,
} from "@/modules/inventory/constants/inventory-data";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/app.config";
import { StatCardGrid } from "@/shared/components/ui/stat-card";

export const metadata: Metadata = {
  title: "Inventory",
};

/**
 * `/admin/inventory` — product catalogue, stock levels and pricing.
 *
 * A Server Component that only assembles widgets and hands them their rows, so
 * replacing the placeholder constants with calls to the Spring Boot inventory
 * endpoints will not change a single child component.
 */
export default function AdminInventoryPage() {
  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Inventory Management"
        description="Manage products, monitor stock levels, and update pricing."
        actions={
          <>
            {/*
              Both destinations are placeholder screens for now. Routing to them
              keeps the buttons honest — they go where they say they go — rather
              than rendering a control that silently does nothing on click.
            */}
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
        <StatCardGrid stats={inventoryStats} />
      </div>

      <div className="mt-5">
        <InventoryTable products={products} meta={pageMeta} />
      </div>
    </div>
  );
}
