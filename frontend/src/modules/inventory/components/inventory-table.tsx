"use client";

import { FileDown, ListFilter, Pencil, PackageSearch, Trash2 } from "lucide-react";
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

  /**
   * Opens a row's panel, or closes it if that same panel is already open.
   *
   * <p>Shared by the card list and the table so the two views cannot disagree
   * about what "open" means. Only one panel is open across the whole screen at
   * a time, which is deliberate: two stock corrections half-filled in at once
   * is a way to submit the wrong one.
   */
  const togglePanel = React.useCallback((id: string, panel: RowPanel) => {
    setOpenRow((current) =>
      current?.id === id && current.panel === panel ? null : { id, panel },
    );
  }, []);

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

      {/*
        ------------------------------ Card list ------------------------------
        Below `md`, where a table cannot be made to work.

        Eight columns need about 960px. On a phone that meant a sideways scroll
        with the SKU pinned at the left and the row's own actions a full screen
        width away to the right — technically not overflowing, and genuinely
        unusable. The same record as a stacked card puts the name, the figures
        and the three actions in one thumb's reach.
      */}
      <ul className="divide-y divide-line md:hidden">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            openPanel={openRow?.id === product.id ? openRow.panel : null}
            onOpenPanel={(panel) => togglePanel(product.id, panel)}
            onClosePanel={() => setOpenRow(null)}
          />
        ))}
      </ul>

      {/*
        ------------------------------- Table --------------------------------
        From `md`, with columns appearing as the width arrives to hold them.

        The breakpoints are picked from the space actually left over rather than
        from the viewport alone, because the navigation rail takes 256px of it
        from `lg`:

          md   768px, no rail    ~720px   name, stock, status, actions
          lg  1024px, less rail  ~700px   + SKU and the selling price
          xl  1280px, less rail  ~960px   + category and the buying price

        Ordered by what a shopkeeper scans for. The name, the count and whether
        it is sellable are the reason this screen is open; the buying price is
        the one figure here that is nobody's first question.
      */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">
                SKU
              </th>
              <th scope="col" className="px-5 py-3 font-medium lg:px-3">
                Product Name
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">
                Category
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right font-medium xl:table-cell"
              >
                Buying ({currency})
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right font-medium lg:table-cell"
              >
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
                onOpenPanel={(panel) => togglePanel(product.id, panel)}
                onClosePanel={() => setOpenRow(null)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {products.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted">
          {isNarrowed
            ? "No products match this search."
            : "The catalogue is empty. Add a product to get started."}
        </p>
      ) : null}

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
          className="hidden px-5 py-3.5 text-left font-normal whitespace-nowrap text-ink-soft lg:table-cell"
        >
          {product.sku}
        </th>

        <td className="px-5 py-3.5 lg:px-3">
          <div className="min-w-0">
            <p className="font-medium text-ink">{product.name}</p>
            {/*
              Below `lg` the SKU has no column of its own, so it joins the
              meta line here rather than disappearing — it is how stock is
              called out loud in the shop, and losing it would make the
              narrow table harder to work from than the phone card.
            */}
            <p className="text-xs text-muted">
              <span className="lg:hidden">{product.sku}</span>
              {product.brand ? (
                <>
                  <span className="lg:hidden"> · </span>
                  {product.brand}
                </>
              ) : null}
              {!product.active ? (
                <>
                  {product.brand ? " · " : <span className="lg:hidden"> · </span>}
                  Withdrawn from sale
                </>
              ) : null}
            </p>
          </div>
        </td>

        <td className="hidden px-3 py-3.5 text-muted xl:table-cell">
          {product.category}
        </td>
        <td className="hidden px-3 py-3.5 text-right whitespace-nowrap text-ink-soft tabular-nums xl:table-cell">
          {formatAmount(product.buyingPrice)}
        </td>
        <td className="hidden px-3 py-3.5 text-right whitespace-nowrap text-ink-soft tabular-nums lg:table-cell">
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
 * One catalogue product as a stacked card, for screens below `md`.
 *
 * <p>Carries the same information and the same three actions as the table row,
 * arranged down the screen instead of across it. Nothing is dropped — a phone
 * is where a shopkeeper checks stock while standing at the shelf, so this is
 * the view that most needs to be complete.
 *
 * <p>The actions are labelled here rather than icon-only. On the table row an
 * icon in a 32px square is fine beside a mouse; under a thumb it is both hard
 * to hit and hard to identify, and "Withdraw" is not an action to leave anybody
 * guessing at.
 */
function ProductCard({
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
  const currency = useCurrency();
  const { label, accent } = stockStatusPresentation[product.status];
  const isDepleted = product.status !== "IN_STOCK";

  return (
    <li
      className={cn(
        accentRow[accent],
        !product.active && "opacity-60",
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* `break-words`, not `truncate`: on a 320px screen a long product
                name is the thing being looked for, and clipping it defeats the
                purpose of the screen. */}
            <p className="font-medium break-words text-ink">{product.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {product.sku}
              {product.brand ? ` · ${product.brand}` : ""}
              {product.category ? ` · ${product.category}` : ""}
            </p>
            {!product.active ? (
              <p className="mt-0.5 text-xs text-muted">Withdrawn from sale</p>
            ) : null}
          </div>

          <Badge label={label} accent={accent} className="shrink-0" />
        </div>

        {/* Three figures across, which fits at 320px. The stock count keeps the
            status colour it has in the table, so a low line is visible without
            reading the badge. */}
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <Figure label={`Buying (${currency})`} value={formatAmount(product.buyingPrice)} />
          <Figure label={`Selling (${currency})`} value={formatAmount(product.sellingPrice)} />
          <Figure
            label="Stock"
            value={formatCount(product.stock)}
            className={isDepleted ? accentText[accent] : "text-ink"}
          />
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <CardAction
            href={routes.adminInventoryEdit(product.id)}
            icon={Pencil}
            label="Edit"
          />
          <CardAction
            icon={PackageSearch}
            label="Stock"
            isOpen={openPanel === "stock"}
            onClick={() => onOpenPanel("stock")}
          />
          <CardAction
            icon={Trash2}
            label={product.active ? "Withdraw" : "Restore"}
            isOpen={openPanel === "withdraw"}
            onClick={() => onOpenPanel("withdraw")}
            className="hover:text-danger"
          />
        </div>
      </div>

      {openPanel ? (
        <ProductRowActions
          product={product}
          panel={openPanel}
          onClose={onClosePanel}
        />
      ) : null}
    </li>
  );
}

/** One labelled figure in a product card's row of three. */
function Figure({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.7rem] text-muted">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-medium tabular-nums",
          className ?? "text-ink-soft",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A labelled action on a product card — a link when it navigates, a button
 * when it opens a panel.
 *
 * <p>Sized to a 40px minimum height rather than the row's 32px squares, which
 * is the smallest comfortable touch target on a phone.
 */
function CardAction({
  href,
  icon: Icon,
  label,
  isOpen,
  onClick,
  className,
}: {
  href?: string;
  icon: typeof Pencil;
  label: string;
  isOpen?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const shape = cn(
    "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
    isOpen
      ? "border-line-strong bg-canvas-subtle text-ink"
      : "border-line text-ink-soft hover:bg-canvas-subtle hover:text-ink",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shape}>
        <Icon aria-hidden className="size-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" aria-expanded={isOpen} onClick={onClick} className={shape}>
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </button>
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
