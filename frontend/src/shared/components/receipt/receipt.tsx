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
 * with 58mm and A4 offered — and set in a monospaced face so the quantity and
 * price columns line up the way every receipt anybody has ever been handed
 * does. See `paper.ts` for what each setting means in millimetres.
 *
 * <p><b>Everything on it comes from the sale document</b>, not from the basket
 * that produced it. The server priced the basket, so the total printed here is
 * the total that was charged; recomputing anything in the browser would let the
 * paper and the ledger disagree, which is the one thing a receipt must never
 * do.
 *
 * <p>The shop's name, address and footer message come from settings, so the
 * owner changes what is printed without a release.
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

  return (
    <article
      // The width is a style rather than a class because it comes from a stored
      // setting: Tailwind generates classes from source at build time and could
      // not produce one for a value only known at runtime.
      style={{ width: paper.width }}
      className={cn(
        "mx-auto max-w-full bg-white px-1 py-2 font-mono text-[11px] leading-[1.45] text-black",
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
            className="mx-auto mb-1 max-h-12 w-auto max-w-[60%] object-contain"
          />
        ) : null}

        <p className="text-[13px] font-bold tracking-tight">
          {shop?.companyName ?? appConfig.name}
        </p>
        {shop?.primaryAddress ? (
          <p className="whitespace-pre-line">{shop.primaryAddress}</p>
        ) : null}
        {shop?.contactPhone ? <p>Tel {shop.contactPhone}</p> : null}
      </header>

      <Divider />

      <dl className="grid grid-cols-[auto_1fr] gap-x-2">
        <dt>Invoice</dt>
        <dd className="text-right font-bold">{sale.invoiceNumber}</dd>

        <dt>Date</dt>
        <dd className="text-right">{formatStamp(sale.soldAt)}</dd>

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

      <Divider />

      {/*
        Each line is two rows: the name on its own, then quantity, unit price and
        total beneath it. A name like "Insee Sanstha Cement 50kg" does not fit
        beside three figures in 72mm, and truncating the one thing the customer
        is checking would make the receipt useless for the only purpose it has.
      */}
      <ul>
        {sale.lines.map((line) => (
          <li key={line.productId + line.sku} className="mb-1">
            <p className="break-words">{line.name}</p>
            <div className="flex justify-between tabular-nums">
              <span>
                {line.quantity} × {amount(line.unitPrice)}
              </span>
              <span>{amount(line.lineTotal)}</span>
            </div>
          </li>
        ))}
      </ul>

      <Divider />

      <dl className="grid grid-cols-[1fr_auto] gap-x-2 tabular-nums">
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

        <div className="col-span-2 my-1 border-t border-dashed border-black" />

        <Row
          label="TOTAL"
          value={`${currency} ${amount(sale.total)}`}
          className="text-[13px] font-bold"
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
        <Row
          label={sale.tender === "CASH" ? "Cash" : "Card"}
          value={`${currency} ${amount(sale.amountTendered ?? sale.total)}`}
        />

        {sale.changeDue > 0 ? (
          <Row label="Change" value={`${currency} ${amount(sale.changeDue)}`} />
        ) : null}
      </dl>

      {/*
        A voided receipt still prints, and says so in the largest type on the
        page. A cancelled sale whose paper copy looks exactly like a valid one
        is how a refund gets claimed twice.
      */}
      {sale.status === "VOIDED" ? (
        <>
          <Divider />
          <p className="text-center text-[15px] font-bold tracking-widest">VOIDED</p>
          {sale.voidReason ? (
            <p className="text-center break-words">{sale.voidReason}</p>
          ) : null}
        </>
      ) : null}

      <Divider />

      <footer className="text-center">
        {shop?.footerMessage ? (
          <p className="break-words">{shop.footerMessage}</p>
        ) : null}
        <p className="mt-1">{sale.lines.length} item{sale.lines.length === 1 ? "" : "s"}</p>
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

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

/**
 * An amount with two decimals and thousands separators, and no symbol.
 *
 * <p>The symbol is printed once per row rather than per figure in the line
 * table, because 72mm of paper does not have room to repeat "Rs." beside every
 * number and the column heading has already said what these are.
 */
/**
 * One money figure on the receipt.
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
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";

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
