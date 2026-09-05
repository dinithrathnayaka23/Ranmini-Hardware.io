"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { useShop } from "@/shared/components/shop-provider";

import { paperFor } from "./paper";
import type { ReceiptSale } from "./receipt-sale";
import { Receipt } from "./receipt";

/**
 * Sends one receipt to the printer, and nothing else on the page with it.
 *
 * <p>The hard part of printing from a web page is not the layout — it is
 * stopping the rest of the page coming along. Hiding the surrounding chrome with
 * print rules means hiding a sibling at every level of the tree between the
 * receipt and the body, which breaks the moment somebody adds a wrapper.
 *
 * <p>So the receipt is <b>portalled to the end of {@code document.body}</b> for
 * the duration of the print, where it is a direct child and a single rule can
 * hide everything beside it (see the print block in `globals.css`). The portal
 * mounts, the browser gets a frame to paint it, the dialog opens, and everything
 * is torn down when the dialog closes.
 *
 * <p>Printing a second copy of the same markup rather than the preview on screen
 * also means the preview can be styled for reading — a card, a border, a page
 * background — while the printed copy stays exactly 72mm of receipt.
 *
 * <p>Mounting this component <em>is</em> the print. It is used two ways: the
 * till mounts it the moment a sale completes, because the button the cashier
 * pressed says "Pay & Print Receipt" and a till that made them press print again
 * would be lying about what it does; and the button beside a looked-up receipt
 * mounts it on click.
 */
export function PrintReceiptPortal({
  sale,
  onDone,
}: {
  sale: ReceiptSale;
  /** Called when the print dialog closes, so the caller can unmount this. */
  onDone: () => void;
}) {
  const paper = paperFor(useShop()?.paperSize);

  // Rendered only after mount: `document` does not exist while the server
  // renders this, and a portal asked for it there would break the page.
  const [container, setContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setContainer(document.body);
  }, []);

  // Held in a ref so the effect below does not re-run — and re-print — every
  // time the caller re-renders with a new inline callback.
  const done = React.useRef(onDone);
  React.useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  React.useEffect(() => {
    if (!container) return;

    // The attribute is what the print stylesheet keys on. Set on the body
    // rather than passed as a class, because the rule it drives has to reach
    // every other child of the body — including anything React has already
    // portalled there.
    document.body.dataset.printingReceipt = "true";

    const finish = () => {
      delete document.body.dataset.printingReceipt;
      done.current();
    };

    window.addEventListener("afterprint", finish);

    // One frame, so the portal is painted before the dialog freezes the page.
    // Without it some browsers open the dialog over a blank sheet.
    const timer = window.setTimeout(() => window.print(), 60);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      // Cleared here as well as in `finish`: a browser that never fires
      // afterprint — or a component unmounted mid-dialog — must not leave the
      // page stuck in its printing state, invisible on screen.
      delete document.body.dataset.printingReceipt;
    };
  }, [container]);

  if (!container) return null;

  return createPortal(
    <div data-print-receipt="">
      {/*
        `@page` is a document-level rule wherever it is declared, so mounting it
        with the portal is what makes the printer's paper follow the shop's
        setting — and unmounting it puts the page back for anything else that
        gets printed afterwards. It cannot live in globals.css, because the size
        is not known until the settings are read.
      */}
      <style>{`@page { ${paper.page} }`}</style>
      <Receipt sale={sale} />
    </div>,
    container,
  );
}
