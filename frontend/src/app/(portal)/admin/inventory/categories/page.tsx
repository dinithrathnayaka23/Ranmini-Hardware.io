import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";

import { CategoryAddForm } from "@/modules/categories/components/category-add-form";
import { CategoryList } from "@/modules/categories/components/category-list";
import { fetchCategories } from "@/modules/categories/services/categories.server";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/app.config";

export const metadata: Metadata = {
  title: "Manage Categories",
};

/**
 * `/admin/inventory/categories` — the shop's product groupings.
 *
 * <p>A list and a one-field form side by side, matching the staff screen: the
 * moment somebody decides they need a new category is while they are looking at
 * the ones that already exist, so making them navigate to a separate page to
 * add it would be a step for nothing.
 *
 * <p>Two columns from `xl` only. At `lg` the portal rail already claims 256px,
 * which leaves too little for a row of controls and a form beside each other.
 */
export default async function ManageCategoriesPage() {
  const categories = await fetchCategories();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Manage Categories"
        description="Group products for the inventory list and for the filter buttons a cashier uses at the till."
        actions={
          <>
            <ButtonLink href={routes.adminInventory} variant="secondary" size="sm">
              <ArrowLeft aria-hidden className="size-4" />
              Back to Inventory
            </ButtonLink>
            <ButtonLink href={routes.adminInventoryNew} size="sm">
              <Plus aria-hidden className="size-4" />
              Add New Product
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <CategoryList categories={categories} />
        </div>

        <div className="min-w-0">
          <CategoryAddForm />
        </div>
      </div>
    </div>
  );
}
