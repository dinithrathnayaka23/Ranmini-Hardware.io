"use client";

import { Download, ListFilter, Pencil, Trash2 } from "lucide-react";
import * as React from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { SearchInput } from "@/shared/components/ui/search-input";
import { appConfig } from "@/shared/config/app.config";
import { accentRow, accentText } from "@/shared/lib/accent";
import { cn } from "@/shared/lib/cn";
import { formatAmount, formatCount } from "@/shared/lib/format";

import {
  stockStatusPresentation,
  type InventoryPageMeta,
  type Product,
  type StockStatus,
} from "../types/inventory.types";

const STATUS_FILTERS: { value: StockStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
];

/**
 * Product listing with search, status filtering and export.
 *
 * SCOPE OF THE INTERACTIVITY: search and filtering run over the rows currently
 * loaded, and export writes those same rows to CSV. That is honest for a
 * client-side page — but it is not a catalogue-wide search. Once the inventory
 * endpoint accepts `q` and `page`, the query should be pushed to the server so
 * it spans all entries, and the footer counts should come from the response.
 */
export function InventoryTable({
  products,
  meta,
}: {
  products: Product[];
  meta: InventoryPageMeta;
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StockStatus | "ALL">("ALL");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      if (status !== "ALL" && product.status !== status) return false;
      if (!needle) return true;

      return [product.sku, product.name, product.category].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
  }, [products, query, status]);

  // Distinguishes "this is page one of the catalogue" from "these are the rows
  // that survived a filter" — the two need different footer wording.
  const isNarrowed = query.trim() !== "" || status !== "ALL";

  return (
    <Card>
      {/* ------------------------------ Toolbar ------------------------------ */}
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          label="Search products by SKU, name or category"
          placeholder="Search by SKU, Name, or Category..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="w-full sm:max-w-96"
        />

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFilterOpen((open) => !open)}
            aria-expanded={isFilterOpen}
            aria-controls="inventory-status-filter"
          >
            <ListFilter aria-hidden className="size-4" />
            Filter
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(visible)}
            // Nothing to export is a real state worth blocking, not an error.
            disabled={visible.length === 0}
          >
            <Download aria-hidden className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {isFilterOpen ? (
        <div
          id="inventory-status-filter"
          className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas-subtle px-4 py-3"
        >
          <span className="text-xs font-medium text-muted">Status</span>
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              aria-pressed={status === option.value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                status === option.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* ------------------------------- Table ------------------------------- */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="px-5 py-3 font-medium">
                SKU
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Product Name
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Category
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Buying ({appConfig.currencySymbol})
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Selling ({appConfig.currencySymbol})
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Stock
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </tbody>
        </table>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No products match your search.
          </p>
        ) : null}
      </div>

      {/* ------------------------------- Footer ------------------------------ */}
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {isNarrowed
            ? `Showing ${formatCount(visible.length)} of ${formatCount(products.length)} loaded entries`
            : `Showing 1 to ${formatCount(visible.length)} of ${formatCount(meta.totalEntries)} entries`}
        </p>

        <Pagination page={meta.page} totalPages={meta.totalPages} />
      </div>
    </Card>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { label, accent } = stockStatusPresentation[product.status];
  const isDepleted = product.status !== "IN_STOCK";

  return (
    <tr
      className={cn("border-b border-line last:border-b-0", accentRow[accent])}
    >
      <th
        scope="row"
        className="px-5 py-3.5 text-left font-normal whitespace-nowrap text-ink-soft"
      >
        {product.sku}
      </th>
      <td className="px-3 py-3.5 font-medium text-ink">{product.name}</td>
      <td className="px-3 py-3.5 text-muted">{product.category}</td>
      <td className="px-3 py-3.5 text-right whitespace-nowrap text-ink-soft tabular-nums">
        {formatAmount(product.buyingPrice)}
      </td>
      <td className="px-3 py-3.5 text-right whitespace-nowrap text-ink-soft tabular-nums">
        {formatAmount(product.sellingPrice)}
      </td>
      {/* The figure repeats the status in colour, but the badge beside it says
          the same thing in words for anyone who cannot see the colour. */}
      <td
        className={cn(
          "px-3 py-3.5 text-right font-semibold tabular-nums",
          isDepleted ? accentText[accent] : "text-ink",
        )}
      >
        {formatCount(product.stock)}
      </td>
      <td className="px-3 py-3.5">
        <Badge label={label} accent={accent} />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <RowAction label={`Edit ${product.name}`} icon={Pencil} />
          <RowAction
            label={`Delete ${product.name}`}
            icon={Trash2}
            className="hover:text-danger"
          />
        </div>
      </td>
    </tr>
  );
}

function RowAction({
  label,
  icon: Icon,
  className,
}: {
  label: string;
  icon: typeof Pencil;
  className?: string;
}) {
  return (
    <button
      type="button"
      // The name includes the product so a screen-reader user hears which row
      // the button belongs to, instead of five identical "Edit" buttons.
      aria-label={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas-subtle hover:text-ink",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}

/**
 * Writes the given rows to a CSV file and hands it to the browser.
 *
 * Entirely client-side, so it works today without a backend — but it exports
 * only what is loaded, which is one page. A full catalogue export needs a
 * server endpoint that streams the file.
 */
function downloadCsv(rows: Product[]): void {
  const header = [
    "SKU",
    "Product Name",
    "Category",
    `Buying (${appConfig.currencySymbol})`,
    `Selling (${appConfig.currencySymbol})`,
    "Stock",
    "Status",
  ];

  const body = rows.map((product) => [
    product.sku,
    product.name,
    product.category,
    product.buyingPrice.toFixed(2),
    product.sellingPrice.toFixed(2),
    String(product.stock),
    stockStatusPresentation[product.status].label,
  ]);

  const csv = [header, ...body]
    .map((cells) => cells.map(escapeCsvCell).join(","))
    .join("\r\n");

  // The byte-order mark makes Excel read this as UTF-8 rather than mangling
  // any non-ASCII character in a product name.
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  // Releasing the URL immediately would race the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Quotes a CSV cell, doubling any quote already inside it. */
function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
