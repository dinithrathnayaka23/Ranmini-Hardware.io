"use client";

import * as React from "react";

import { useShop } from "@/shared/components/shop-provider";
import { appConfig } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";

import { shopLogoUrl } from "@/shared/lib/shop-logo-url";

import { paperFor } from "./paper";
import type { ReceiptSale } from "./receipt-sale";

/**
 * A printed receipt.
 *
 * <p>Sized from Settings → Receipts → Paper Size — an 80mm roll by default,
 * with 58mm and A4 offered. See `paper.ts` for what each setting means in
 * millimetres.
 *
 * <p><b>Everything on it comes from the sale document</b>, not from the basket
 * that produced it. The server priced the basket, so the total printed here is
 * the total that was charged; recomputing anything in the browser would let the
 * paper and the ledger disagree, which is the one thing a receipt must never
 * do.
 *
 * <p>The shop's name, address and footer message come from settings, so the
 * owner changes what is printed without a release.
 *
 * <h4>How it is set</h4>
 *
 * <p><b>Proportional type, not monospace.</b> The whole receipt used to be set
 * in a monospaced face, on the reasoning that the figures had to line up. They
 * do — but `tabular-nums` lines up figures in a proportional face too, and it
 * does it without making the shop's name and address look like a fax. The
 * columns are as straight as they were and everything else reads far better.
 *
 * <p><b>Every size is relative to the paper's base.</b> Nothing here is a fixed
 * pixel value, so one number in `paper.ts` scales the whole document from a
 * 58mm roll to an A4 sheet without a second layout.
 *
 * <p><b>Pure black, and hierarchy from weight and size alone.</b> A thermal
 * printer is a one-bit device: it has no grey, and a grey label dithers into a
 * muddy speckle that reads worse than the black it was trying to soften. Every
 * distinction on this receipt is therefore made with size, weight or space.
 *
 * <p><b>Three rules, each meaning something different.</b> It used to have five
 * identical dashed lines, which is enough repetition to stop being punctuation
 * and start being texture: a solid rule closes the header, a light one opens
 * the item table, and the one dashed rule sits above the total, where the eye
 * is meant to stop.
 */
export function Receipt({
  sale,
  className,
}: {
  sale: ReceiptSale;
  className?: string;
}) {
  const shop = useShop();
  const currency = shop?.currencySymbol ?? appConfig.currencySymbol;
  const paper = paperFor(shop?.paperSize);

  // Both conditions matter. `showLogo` is the shop saying it wants one printed;
  // the stamp is whether one actually exists. Until now the first was a
  // settings checkbox that changed a stored value nothing read.
  const logo = shop?.showLogo ? shopLogoUrl(shop.logoUpdatedAt) : null;

  // Units, not lines. "3 items" beside a basket holding ten bags of cement is
  // the sort of thing a customer stops to query at the counter.
  const units = sale.lines.reduce((running, line) => running + line.quantity, 0);

  return (
    <article
      // Width and base size are styles rather than classes because they come
      // from a stored setting: Tailwind generates classes from source at build
      // time and could not produce one for a value only known at runtime.
      style={{ width: paper.width, fontSize: paper.fontSize }}
      className={cn(
        "mx-auto max-w-full bg-white px-1 py-2 leading-[1.5] text-black",
        className,
      )}
    >
      <header className="text-center">
        {logo ? (
          // A plain <img>: this is a print document, and next/image wraps its
          // output in a sized container with a loading state that a thermal
          // printer has no use for. Bounded in height so a tall source cannot
          // push the invoice number off the top of an 80mm roll.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="mx-auto mb-[0.6em] max-h-[4.5em] w-auto max-w-[55%] object-contain"
          />
        ) : null}

        <p className="text-[1.45em] leading-tight font-bold tracking-tight">
          {shop?.companyName ?? appConfig.name}
        </p>

        {shop?.primaryAddress ? (
          <p className="mt-[0.35em] whitespace-pre-line">{shop.primaryAddress}</p>
        ) : null}
        {shop?.contactPhone ? <p>Tel {shop.contactPhone}</p> : null}
      </header>

      {/* Solid: this closes the letterhead, and is the only rule on the page
          that separates two different kinds of thing rather than two sections
          of the same list. */}
      <div className="mt-[0.8em] border-t border-black" />

      <dl className="mt-[0.6em] grid grid-cols-[auto_1fr] gap-x-3 gap-y-[0.15em]">
        <dt>Invoice</dt>
        <dd className="text-right font-semibold tabular-nums">{sale.invoiceNumber}</dd>

        <dt>Date</dt>
        <dd className="text-right tabular-nums">{formatStamp(sale.soldAt)}</dd>

        {sale.cashierName ? (
          <>
            <dt>Cashier</dt>
            <dd className="truncate text-right">{sale.cashierName}</dd>
          </>
        ) : null}

        {sale.terminalName ? (
          <>
            <dt>Till</dt>
            <dd className="text-right">{sale.terminalName}</dd>
          </>
        ) : null}
      </dl>

      {/*
        A heading for the item table. It costs one line and buys the thing a
        receipt is read for: knowing, without working it out, which column is
        the unit price and which is what you were charged.
      */}
      <div className="mt-[0.9em] flex justify-between border-y border-black py-[0.25em] text-[0.85em] font-semibold tracking-[0.08em] uppercase">
        <span>Item</span>
        <span>Amount</span>
      </div>

      {/*
        Each line is two rows: the name on its own, then quantity, unit price and
        total beneath it. A name like "Insee Sanstha Cement 50kg" does not fit
        beside three figures in 72mm, and truncating the one thing the customer
        is checking would make the receipt useless for the only purpose it has.
      */}
      <ul className="mt-[0.5em] space-y-[0.55em]">
        {sale.lines.map((line) => (
          <li key={line.productId + line.sku}>
            <p className="break-words">{line.name}</p>
            <div className="flex justify-between gap-3 tabular-nums">
              {/* Indented, so the eye reads it as belonging to the name above
                  rather than as another product. */}
              <span className="pl-[1em] text-[0.92em]">
                {line.quantity} × {amount(line.unitPrice)}
              </span>
              <span className="font-medium">{amount(line.lineTotal)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-[0.8em] border-t border-black" />

      <dl className="mt-[0.6em] grid grid-cols-[1fr_auto] gap-x-3 gap-y-[0.15em] tabular-nums">
        <Row label="Subtotal" value={`${currency} ${amount(sale.subtotal)}`} />

        {sale.discountAmount > 0 ? (
          <Row
            label={`Discount ${trimPercent(sale.discountPercent)}%`}
            value={`-${currency} ${amount(sale.discountAmount)}`}
          />
        ) : null}

        {sale.taxAmount > 0 ? (
          <Row
            label={`Tax ${trimPercent(sale.taxRate)}%`}
            value={`${currency} ${amount(sale.taxAmount)}`}
          />
        ) : null}

        {/* The one dashed rule on the receipt, and the only place the eye is
            meant to stop. */}
        <div className="col-span-2 my-[0.45em] border-t border-dashed border-black" />

        <Row
          label="TOTAL"
          value={`${currency} ${amount(sale.total)}`}
          className="text-[1.35em] leading-tight font-bold"
        />

        {/*
          `??`, not a null check. The API omits null fields entirely
          (`default-property-inclusion: non_null`), so a sale with no tender
          recorded arrives with no `amountTendered` key at all — undefined, not
          null. The old `=== null` test missed that and printed
          `amount(undefined)`, which threw and took the whole till down with it.

          No tender recorded means the customer paid the exact amount, so the
          total is the honest figure to print.
        */}
        <div className="col-span-2 mt-[0.5em]" />

        <Row
          label={sale.tender === "CASH" ? "Cash" : "Card"}
          value={`${currency} ${amount(sale.amountTendered ?? sale.total)}`}
        />

        {sale.changeDue > 0 ? (
          <Row
            label="Change"
            value={`${currency} ${amount(sale.changeDue)}`}
            className="font-semibold"
          />
        ) : null}
      </dl>

      {/*
        A voided receipt still prints, and says so in the largest type on the
        page. A cancelled sale whose paper copy looks exactly like a valid one
        is how a refund gets claimed twice.
      */}
      {sale.status === "VOIDED" ? (
        <div className="mt-[0.9em] border-y-2 border-black py-[0.4em] text-center">
          <p className="text-[1.5em] leading-tight font-bold tracking-[0.15em]">
            VOIDED
          </p>
          {sale.voidReason ? (
            <p className="mt-[0.2em] break-words">{sale.voidReason}</p>
          ) : null}
        </div>
      ) : null}

      <footer className="mt-[1em] border-t border-black pt-[0.6em] text-center">
        <p className="tabular-nums">
          {units} {units === 1 ? "item" : "items"}
          {sale.lines.length !== units ? ` on ${sale.lines.length} lines` : ""}
        </p>

        {shop?.footerMessage ? (
          <p className="mt-[0.4em] break-words">{shop.footerMessage}</p>
        ) : null}
      </footer>
    </article>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <>
      <dt className={className}>{label}</dt>
      <dd className={cn("text-right", className)}>{value}</dd>
    </>
  );
}

/**
 * One money figure on the receipt.
 *
 * <p>Printed without a symbol in the item table, because the paper does not
 * have room to repeat "Rs." beside every number and the column heading has
 * already said what these are. The totals below do carry it.
 *
 * <p>Tolerates a missing value rather than throwing. This is a printed document
 * rendered with a customer at the counter, and a thrown error here does not
 * spoil one line — it unmounts the till. A dash says plainly that a figure is
 * unavailable; printing a zero would be worse, because nobody would question it.
 *
 * <p>Every caller should be passing a real number, and the ones that could
 * legitimately be absent resolve their own fallback before calling. This is the
 * backstop for the case nobody predicted.
 */
function amount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 15.00 prints as 15; 7.50 stays 7.5. Trailing zeroes waste narrow paper. */
function trimPercent(value: number): string {
  return String(Number(value.toFixed(2)));
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
