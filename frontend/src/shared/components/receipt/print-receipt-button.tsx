"use client";

import { Printer } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";

import { PrintReceiptPortal } from "./print-receipt-portal";
import type { ReceiptSale } from "./receipt-sale";

/**
 * A button that prints one receipt.
 *
 * <p>All it does is mount {@link PrintReceiptPortal}, which is where the actual
 * work lives — the till prints the same way without a button, because the
 * control the cashier pressed already said "Pay & Print Receipt".
 */
export function PrintReceiptButton({
  sale,
  label = "Print receipt",
  variant = "secondary",
}: {
  sale: ReceiptSale;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handleDone = React.useCallback(() => setIsPrinting(false), []);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => setIsPrinting(true)}
        // Disabled while a dialog is open, so a second click cannot stack two
        // portals and print the receipt twice.
        disabled={isPrinting}
      >
        <Printer aria-hidden className="size-4" />
        {label}
      </Button>

      {isPrinting ? <PrintReceiptPortal sale={sale} onDone={handleDone} /> : null}
    </>
  );
}
