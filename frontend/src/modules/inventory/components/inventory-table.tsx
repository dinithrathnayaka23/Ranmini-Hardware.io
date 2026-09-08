"use client";

import { FileDown, ListFilter, Package, Pencil, PackageSearch, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { SearchInput } from "@/shared/components/ui/search-input";
import { useCurrency } from "@/shared/components/shop-provider";
import { routes } from "@/shared/config/app.config";
import { accentRow, accentText } from "@/shared/lib/accent";
import { cn } from "@/shared/lib/cn";
import { formatAmount, formatCount } from "@/shared/lib/format";
import { productImageUrl } from "@/shared/lib/product-image-url";

import {
  stockStatusPresentation,
  type InventoryPageMeta,
  type Product,
  type StockStatus,
} from "../types/inventory.types";

import { ProductRowActions, type RowPanel } from "./product-row-actions";

const STATUS_FILTERS: { value: StockStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
];

/** How long typing pauses before the search is sent. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * The product listing, with search, filtering, export and row actions.
 *
 * <p><b>Search and filtering are the server's job.</b> They used to run in the
 * browser over the ten rows the page had loaded, which quietly meant something
 * different from what it looked like: "Out of Stock" showed the out-of-stock
 * products that happened to be on page one, and a search for a product on page
 * four found nothing at all. Both now live in the URL, which makes them a
 * backend query against the text index — and makes a filtered view something a
 * shopkeeper can bookmark or send to somebody else.
 *
 * <p>Typing is debounced rather than sent on every keystroke: a shop connection
 * and a text index do not need one query per letter. The URL is replaced rather
 * than pushed, so a search does not leave twenty entries in the back history.
 *
 * <p>Withdrawn products are listed here, greyed and labelled. They are gone from
 * the till, but hiding them from the catalogue too would leave somebody who
 * withdrew a line by mistake with no way to find it again.
 */
export function InventoryTable({
  products,
  meta,
  query,
  status,
}: {
  products: Product[];
  meta: InventoryPageMeta;
  /** The search term from the URL — this component does not own it. */
  query: string;
  status: StockStatus | "ALL";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currency = useCurrency();

  const [draft, setDraft] = React.useState(query);
  const [isFilterOpen, setIsFilterOpen] = React.useState(status !== "ALL");
  const [openRow, setOpenRow] = React.useState<{ id: string; panel: RowPanel } | null>(
    null,
  );

  // The URL is the source of truth: a back-button navigation changes it without
  // this component knowing, and the box has to follow.
  React.useEffect(() => {
    setDraft(query);
  }, [query]);

  const applyParams = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }

      // Any change to what is being looked for starts again at page one.
      // Staying on page four of a previous search is how a screen ends up
      // saying "no products" about a catalogue that has plenty.
      params.delete("page");

      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounced: one query per pause in typing, not one per letter.
  React.useEffect(() => {
    if (draft === query) return;

    const timer = window.setTimeout(
      () => applyParams({ q: draft.trim() || null }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [applyParams, draft, query]);

  /**
   * Where the Export button points.
   *
   * <p>The same filters the table is showing, so the printed stock sheet is what
   * was on screen rather than a different report with the same name.
   * `activeOnly=false` matches this listing, which includes withdrawn lines.
   */
  const exportHref = React.useMemo(() => {
    const params = new URLSearchParams({ activeOnly: "false" });
    if (query) params.set("q", query);
    if (status !== "ALL") params.set("status", status);
    return `/api/inventory/export?${params}`;
  }, [query, status]);

  const isNarrowed = query !== "" || status !== "ALL";
  const firstRow = (meta.page - 1) * meta.pageSize + 1;
  const lastRow = firstRow + products.length - 1;

  return (
    <Card>
      {/* ------------------------------ Toolbar ------------------------------ */}
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          label="Search products by SKU, name or brand"
          placeholder="Search by SKU, Name, or Brand..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
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

          {/*
            A link, not a button. The response is a file, and a download has to
            be a navigation for the browser to save it with the filename the
            server chose — which is the date-stamped one, not "export.pdf".
          */}
          <a
            href={exportHref}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-canvas-subtle focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
          >
            <FileDown aria-hidden className="size-4" />
            Export PDF
          </a>
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
              onClick={() =>
                applyParams({ status: option.value === "ALL" ? null : option.value })
              }
              aria-pressed={status === option.value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                status === option.value
                  ? "border-brand-600 bg-brand-600 text-on-brand"
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
        <table className="w-full min-w-[60rem] border-collapse text-sm">
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
                Buying ({currency})
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Selling ({currency})
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
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                openPanel={openRow?.id === product.id ? openRow.panel : null}
                onOpenPanel={(panel) =>
                  setOpenRow((current) =>
                    current?.id === product.id && current.panel === panel
                      ? null
                      : { id: product.id, panel },
                  )
                }
                onClosePanel={() => setOpenRow(null)}
              />
            ))}
          </tbody>
        </table>

        {products.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {isNarrowed
              ? "No products match this search."
              : "The catalogue is empty. Add a product to get started."}
          </p>
        ) : null}
      </div>

      {/* ------------------------------- Footer ------------------------------ */}
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {meta.totalEntries === 0
            ? "No entries"
            : `Showing ${formatCount(firstRow)} to ${formatCount(lastRow)} of ${formatCount(
                meta.totalEntries,
              )} ${isNarrowed ? "matching entries" : "entries"}`}
        </p>

        <Pagination page={meta.page} totalPages={meta.totalPages} />
      </div>
    </Card>
  );
}

function ProductRow({
  product,
  openPanel,
  onOpenPanel,
  onClosePanel,
}: {
  product: Product;
  openPanel: RowPanel;
  onOpenPanel: (panel: RowPanel) => void;
  onClosePanel: () => void;
}) {
  const { label, accent } = stockStatusPresentation[product.status];
  const isDepleted = product.status !== "IN_STOCK";

  return (
    <>
      <tr
        className={cn(
          "border-b border-line",
          accentRow[accent],
          // A withdrawn line is still readable but plainly not on sale, so it
          // cannot be mistaken for a product a customer could be sold.
          !product.active && "opacity-60",
        )}
      >
        <th
          scope="row"
          className="px-5 py-3.5 text-left font-normal whitespace-nowrap text-ink-soft"
        >
          {product.sku}
        </th>

        <td className="px-3 py-3.5">
          <div className="flex items-center gap-3">
            <Thumbnail product={product} />
            <div className="min-w-0">
              <p className="font-medium text-ink">{product.name}</p>
              {product.brand || !product.active ? (
                <p className="text-xs text-muted">
                  {product.brand}
                  {product.brand && !product.active ? " · " : ""}
                  {!product.active ? "Withdrawn from sale" : ""}
                </p>
              ) : null}
            </div>
          </div>
        </td>

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
            <Link
              href={routes.adminInventoryEdit(product.id)}
              aria-label={`Edit ${product.name}`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas-subtle hover:text-ink"
            >
              <Pencil aria-hidden className="size-4" />
            </Link>

            <RowAction
              label={`Adjust stock for ${product.name}`}
              icon={PackageSearch}
              isOpen={openPanel === "stock"}
              onClick={() => onOpenPanel("stock")}
            />

            <RowAction
              label={
                product.active
                  ? `Withdraw ${product.name} from sale`
                  : `Put ${product.name} back on sale`
              }
              icon={Trash2}
              isOpen={openPanel === "withdraw"}
              onClick={() => onOpenPanel("withdraw")}
              className="hover:text-danger"
            />
          </div>
        </td>
      </tr>

      {openPanel ? (
        <tr className="border-b border-line">
          {/* One cell across the table: the panel belongs to the whole row, and
              confining it to the actions column would make it a sliver. */}
          <td colSpan={8} className="p-0">
            <ProductRowActions
              product={product}
              panel={openPanel}
              onClose={onClosePanel}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

/**
 * The product photograph at row size.
 *
 * <p>A real catalogue is never fully photographed, so the neutral tile is the
 * ordinary case rather than an error state. A failed load falls back to it too:
 * a broken image icon in an admin table reads as a system fault.
 */
function Thumbnail({ product }: { product: Product }) {
  const [hasFailed, setHasFailed] = React.useState(false);
  const url = productImageUrl(product);

  if (!url || hasFailed) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-subtle text-placeholder">
        <Package aria-hidden className="size-4" />
      </span>
    );
  }

  return (
    <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-canvas-subtle">
      <Image
        src={url}
        alt=""
        fill
        sizes="36px"
        onError={() => setHasFailed(true)}
        className="object-cover"
      />
    </span>
  );
}

function RowAction({
  label,
  icon: Icon,
  isOpen,
  onClick,
  className,
}: {
  label: string;
  icon: typeof Pencil;
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      // The name includes the product so a screen-reader user hears which row
      // the button belongs to, instead of five identical "Adjust stock" buttons.
      aria-label={label}
      aria-expanded={isOpen}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-canvas-subtle hover:text-ink",
        isOpen ? "bg-canvas-subtle text-ink" : "text-muted",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  );
}
