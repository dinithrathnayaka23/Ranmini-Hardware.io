import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { requireAdmin } from "@/modules/auth/services/session.server";
import { ProductImport } from "@/modules/inventory/import/product-import";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/app.config";

export const metadata: Metadata = {
  title: "Import Products",
};

/**
 * `/admin/inventory/import` — adding and updating products from a spreadsheet.
 *
 * The way a whole catalogue gets in: typing thirty thousand products into the
 * product form one at a time is not a plan anyone would follow.
 */
export default async function ImportProductsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Import Products"
        description="Add or update many products at once from a spreadsheet saved as CSV."
        actions={
          <ButtonLink href={routes.adminInventory} variant="secondary" size="sm">
            <ArrowLeft aria-hidden className="size-4" />
            Back to Inventory
          </ButtonLink>
        }
      />

      <div className="mt-6 max-w-4xl">
        <ProductImport />
      </div>
    </div>
  );
}
