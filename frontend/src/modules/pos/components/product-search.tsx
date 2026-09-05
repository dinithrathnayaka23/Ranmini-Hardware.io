"use client";

import { Search } from "lucide-react";
import * as React from "react";

/**
 * Product lookup at the top of the catalogue.
 *
 * <p>Typed and tapped, not scanned. The shop has no barcode reader, so this is
 * the only way to narrow a catalogue too long to browse — which makes it the
 * busiest control on the screen and the reason it is autofocused on load and
 * reachable from anywhere with F2.
 *
 * <p>Enter adds the product when the search has narrowed to one, so a cashier
 * who knows the shelf code can type it and carry on without reaching for the
 * grid. It matches the code as well as the name, because a shelf label is often
 * quicker to read than a product name is to spell.
 */
export const ProductSearch = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onValueChange: (value: string) => void;
    /** Called on Enter, when the search has narrowed to a single product. */
    onSubmit: () => void;
  }
>(function ProductSearch({ value, onValueChange, onSubmit }, ref) {
  return (
    <div
      className="flex items-center rounded-xl border-2 border-line bg-surface transition-[border-color,box-shadow] duration-150
                 hover:border-line-strong focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15"
    >
      <Search
        aria-hidden
        className="pointer-events-none ml-3 size-5 shrink-0 text-placeholder sm:ml-4 sm:size-6"
      />

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          // Escape clears a mistyped search without reaching for the mouse.
          if (event.key === "Escape") onValueChange("");
        }}
        placeholder="Search by name or code (F2)"
        aria-label="Search products by name or code"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // The till opens ready to type; there is nothing else on this screen a
        // cashier would want the keyboard pointed at.
        autoFocus
        className="h-11 w-full bg-transparent px-3 text-[0.95rem] text-ink sm:px-3.5
                   placeholder:text-placeholder focus:outline-none
                   [&::-webkit-search-cancel-button]:appearance-none sm:h-13 lg:h-14"
      />

      <kbd
        aria-hidden
        className="mr-3 hidden shrink-0 rounded-md border border-line bg-canvas-subtle px-2 py-1 text-xs font-medium text-muted sm:block"
      >
        F2
      </kbd>
    </div>
  );
});
