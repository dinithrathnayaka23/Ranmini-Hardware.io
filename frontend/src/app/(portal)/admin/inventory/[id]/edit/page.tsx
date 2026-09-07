import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchCategories } from "@/modules/categories/services/categories.server";
import { ProductForm } from "@/modules/inventory/components/product-form";
import { fetchProduct } from "@/modules/inventory/services/inventory.server";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ButtonLink } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/app.config";
import { ApiError } from "@/shared/lib/http-error";

export const metadata: Metadata = {
  title: "Edit Product",
};

/**
 * `/admin/inventory/{id}/edit` — changes a product's details.
 *
 * <p>A real route rather than a dialog over the table. An edit is a page's worth
 * of fields, it can be linked to and bookmarked, and the browser's back button
 * behaves — none of which a modal gives, and all of which matter on a screen
 * somebody reaches from a row they searched for.
 *
 * <p>The product and the categories load in parallel: neither depends on the
 * other, and awaiting them in sequence would add a whole round trip to every
 * page load for nothing.
 *
 * <p>The product is read fresh on every request rather than from the listing's
 * cache. A form seeded with stale figures would save them back, quietly undoing
 * whatever changed in between — a stock adjustment most of all.
 */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    loadProduct(id),
    fetchCategories(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={product.name}
        description={`${product.sku} · ${product.category}`}
        actions={
          <ButtonLink href={routes.adminInventory} variant="secondary" size="sm">
            <ArrowLeft aria-hidden className="size-4" />
            Back to Inventory
          </ButtonLink>
        }
      />

      {/* Wide enough for the form's two columns from `xl`; the form itself
          stays a single column below that, so this is a ceiling rather than a
          width. */}
      <div className="mt-6 max-w-6xl">
        <ProductForm categories={categories} product={product} />
      </div>
    </div>
  );
}

/**
 * The product, or the framework's own 404 page.
 *
 * <p>A product id that does not exist is an ordinary way to arrive here — a
 * stale bookmark, a link from an old email — and it deserves the not-found page
 * rather than an error boundary saying something went wrong. Anything else is a
 * genuine failure and is left to propagate.
 */
async function loadProduct(id: string) {
  try {
    return await fetchProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
