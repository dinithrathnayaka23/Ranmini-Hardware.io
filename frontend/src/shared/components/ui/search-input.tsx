"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Not rendered, but required — a bare search box needs an accessible name. */
  label: string;
  containerClassName?: string;
}

/**
 * Toolbar search field.
 *
 * `type="search"` gives browsers their native clear affordance, and the visible
 * label is replaced by `aria-label` because the placeholder alone disappears as
 * soon as the user starts typing.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { label, className, containerClassName, ...props },
    ref,
  ) {
    return (
      <div
        className={cn(
          "flex items-center rounded-[10px] border border-line bg-surface transition-colors",
          "hover:border-line-strong focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15",
          containerClassName,
        )}
      >
        <Search
          aria-hidden
          className="pointer-events-none ml-3.5 size-[18px] shrink-0 text-placeholder"
        />
        <input
          ref={ref}
          type="search"
          aria-label={label}
          className={cn(
            "h-10 w-full bg-transparent px-3 text-sm text-ink",
            "placeholder:text-placeholder focus:outline-none",
            // Chrome draws its own cancel button that clashes with the border.
            "[&::-webkit-search-cancel-button]:appearance-none",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
