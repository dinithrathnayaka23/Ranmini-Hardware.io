import { PackagePlus } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/shared/components/layout/section-placeholder";

export const metadata: Metadata = {
  title: "Add New Product",
};

/** `/admin/inventory/new` — placeholder until the product form is designed. */
export default function AddProductPage() {
  return (
    <SectionPlaceholder
      title="Add New Product"
      description="Create a product record with pricing, category and opening stock."
      icon={PackagePlus}
    />
  );
}
