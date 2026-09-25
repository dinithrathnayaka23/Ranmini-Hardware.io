"use client";

import { SegmentedControl } from "@/shared/components/ui/segmented-control";

import type { PosCategory } from "../types/pos.types";

/**
 * Category filter above the product grid.
 *
 * A segmented control whose highlight slides to the chosen category, so a
 * cashier glancing back at the screen can see at once which slice of the
 * catalogue the grid is showing.
 *
 * It scrolls sideways rather than wrapping to a second row: on a tablet the
 * filter must not steal height from the product grid. The control announces
 * itself as a group of toggles rather than tabs, because these filter one grid
 * in place and a screen-reader user should not be promised panels that do not
 * exist.
 */
export function CategoryFilter({
  categories,
  activeId,
  onSelect,
}: {
  categories: PosCategory[];
  activeId: string;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <SegmentedControl
      label="Filter products by category"
      options={categories.map((category) => ({
        value: category.id,
        label: category.label,
      }))}
      value={activeId}
      onChange={onSelect}
      tone="brand"
      scrollable
    />
  );
}
