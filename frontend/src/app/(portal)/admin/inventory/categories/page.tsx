import { Network } from "lucide-react";
import type { Metadata } from "next";

import { SectionPlaceholder } from "@/shared/components/layout/section-placeholder";

export const metadata: Metadata = {
  title: "Manage Categories",
};

/** `/admin/inventory/categories` — placeholder until the screen is designed. */
export default function ManageCategoriesPage() {
  return (
    <SectionPlaceholder
      title="Manage Categories"
      description="Organise products into categories and sub-categories."
      icon={Network}
    />
  );
}
