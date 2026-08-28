"use client";

import { Barcode } from "lucide-react";
import * as React from "react";

/**
 * Product lookup at the top of the catalogue.
 *
 * Built for a barcode scanner first and fingers second. A scanner behaves like
 * a keyboard that types a SKU and presses Enter, so this field is autofocused
 * on load, refocused by F2, and submits on Enter — which is what lets a cashier
 * ring up an order without ever touching the screen.
 */
export const ProductSearch = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onValueChange: (value: string) => void;
    /** Called on Enter — the scanner's "done" keystroke. */
    onSubmit: () => void;
  }
>(function ProductSearch({ value, onValueChange, onSubmit }, ref) {
  return (
    <div
      className="flex items-center rounded-xl border-2 border-line bg-surface transition-colors
                 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15"
    >
      <Barcode
        aria-hidden
        className="pointer-events-none ml-4 size-6 shrink-0 text-placeholder"
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
          // Escape clears a mistyped scan without reaching for the mouse.
          if (event.key === "Escape") onValueChange("");
        }}
        placeholder="Search Product (F2)"
        aria-label="Search products by name or SKU"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // The till opens ready to scan; there is nothing else on this screen a
        // cashier would want the keyboard pointed at.
        autoFocus
        className="h-12 w-full bg-transparent px-3.5 text-[0.95rem] text-ink
                   placeholder:text-placeholder focus:outline-none
                   [&::-webkit-search-cancel-button]:appearance-none sm:h-14"
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
