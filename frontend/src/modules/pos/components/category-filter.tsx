"use client";

import { cn } from "@/shared/lib/cn";

import type { PosCategory } from "../types/pos.types";

/**
 * Category chips above the product grid.
 *
 * Plain buttons carrying `aria-pressed` rather than a tab list: these filter
 * one grid in place, and announcing them as tabs would promise a screen-reader
 * user panels that do not exist.
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
    <div
      // Scrolls sideways rather than wrapping to a second row: on a tablet the
      // chips must not steal height from the product grid.
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Filter products by category"
    >
      {categories.map((category) => {
        const isActive = category.id === activeId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-600 text-white"
                : "border border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-brand-50/40",
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
