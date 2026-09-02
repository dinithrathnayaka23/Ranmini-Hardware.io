import { ArrowLeft, Network } from "lucide-react";
import type { Metadata } from "next";

import { fetchCategories } from "@/modules/categories/services/categories.server";
import { ProductForm } from "@/modules/inventory/components/product-form";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { Card, CardBody } from "@/shared/components/ui/card";
import { routes } from "@/shared/config/app.config";

export const metadata: Metadata = {
  title: "Add New Product",
};

/**
 * `/admin/inventory/new` — creates a catalogue entry.
 *
 * <p>The categories are fetched here rather than inside the form so the page
 * arrives with the dropdown already populated. A shopkeeper who has just
 * clicked "Add New Product" should be able to start typing, not watch a select
 * fill itself in.
 *
 * <p>Constrained to `max-w-4xl` rather than the catalogue's full width: a form
 * whose fields stretch across a wide monitor is measurably harder to read down,
 * and there is nothing here that benefits from the extra room.
 */
export default async function AddProductPage() {
  const categories = await fetchCategories();

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Add New Product"
        description="Create a product record with its pricing, category and opening stock."
        actions={
          <ButtonLink href={routes.adminInventory} variant="secondary" size="sm">
            <ArrowLeft aria-hidden className="size-4" />
            Back to Inventory
          </ButtonLink>
        }
      />

      <div className="mt-6 max-w-4xl">
        {categories.length === 0 ? <NoCategoriesYet /> : <ProductForm categories={categories} />}
      </div>
    </div>
  );
}

/**
 * Shown when the shop has no categories.
 *
 * <p>Every product must be filed under one, so rendering the form would mean
 * offering an empty dropdown and a save that cannot succeed. Naming the missing
 * step and linking to it is the honest version of that.
 */
function NoCategoriesYet() {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-14 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-canvas-subtle text-muted"
        >
          <Network className="size-6" />
        </span>

        <div>
          <p className="text-sm font-medium text-ink">Add a category first</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Every product is filed under a category, and there are none yet.
            Create one — Plumbing, Electrical, Cement &amp; Sand — and then come
            back here.
          </p>
        </div>

        <ButtonLink href={routes.adminInventoryCategories} size="md">
          <Network aria-hidden className="size-4" />
          Manage Categories
        </ButtonLink>
      </CardBody>
    </Card>
  );
}
