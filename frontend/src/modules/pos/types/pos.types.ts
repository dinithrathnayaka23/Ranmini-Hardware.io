/**
 * Point-of-sale view model.
 *
 * Describes what the till renders, not the backend's persistence shape. When
 * the Spring Boot sales endpoints land, map their responses onto these types in
 * a service module so the components stay untouched.
 */

/**
 * Stock state of a product on the shop floor.
 *
 * Deliberately declared here rather than imported from the inventory module:
 * feature modules do not import from one another, and the till needs a
 * different presentation of the same idea (a live count on a card, not a status
 * chip in a table). If a third module ever needs this union, promote it to
 * `shared/` rather than adding a cross-module import.
 *
 * Like inventory's, the status is supplied by the backend rather than derived
 * from `stock` in the browser — the reorder threshold is per product and lives
 * server-side.
 */
export type PosStockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/** A product as the till needs it: enough to show, price and sell. */
/** One page of the till's catalogue, and whether another follows. */
export interface CataloguePage {
  items: PosProduct[];
  hasMore: boolean;
}

export interface PosProduct {
  id: string;
  sku: string;
  name: string;
  /** Matches a {@link PosCategory} id, or "all" is never stored here. */
  categoryId: string;
  /** Retail price per unit, in the store's base currency. */
  unitPrice: number;
  /** Units on hand; the till refuses to sell more than this. */
  stock: number;
  status: PosStockStatus;
  /**
   * Path to a photograph bundled with the build, or null.
   *
   * Optional because a real catalogue is never fully photographed — the card
   * falls back to a neutral tile rather than a broken image.
   */
  imageUrl?: string | null;
  /**
   * When an uploaded photograph last changed, or null when there is none.
   *
   * An upload takes precedence over {@link imageUrl}; `productImageUrl()` is
   * the one place that decides between them.
   */
  imageVersion?: string | null;
}

/** A filter chip above the product grid. */
export interface PosCategory {
  id: string;
  label: string;
}

/**
 * One line of the order being built.
 *
 * The price is copied onto the line rather than read back from the catalogue,
 * so a price change mid-sale cannot silently alter an order already on screen.
 */
export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Units on hand when the line was added — the ceiling for the + button. */
  availableStock: number;
}

/** How the customer is paying. */
export type TenderMethod = "CASH" | "CARD";

/** Everything the summary panel displays about the current order. */
export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  /**
   * The shop's tax percentage, carried so the summary can label the line.
   *
   * Zero when the shop charges no tax, which is the default — the line is
   * hidden entirely rather than printed as "Tax 0%".
   */
  taxRate: number;
  taxAmount: number;
  /**
   * What the customer will actually be charged: subtotal, less discount, plus
   * tax. This omitted the tax until the till started reading the shop's rate,
   * which meant a shop with a tax rate quoted one price and charged another.
   */
  total: number;
  /** Total units across all lines, not the number of distinct lines. */
  itemCount: number;
}

/** A completed sale, as the backend returns it. */
export interface CompletedSale {
  id: string;
  invoiceNumber: string;
  businessDate: string;
  soldAt: string;
  // Optional, not just nullable: the API omits null fields rather than
  // sending them, so an absent value arrives as undefined. See `api.server.ts`.
  cashierName?: string | null;
  terminalName?: string | null;
  lines: {
    productId: string;
    sku: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  tender: TenderMethod;
  /** Absent when no tender was recorded — a card sale, or cash paid exactly. */
  amountTendered?: number | null;
  changeDue: number;
  status: "COMPLETED" | "VOIDED";
  /**
   * Lines this sale pushed to or below their reorder level.
   *
   * Only ever populated on the response to a checkout, and only for lines the
   * sale actually *changed* — see {@link StockNotice}. A receipt read back
   * later carries none, because a stock level from last Tuesday is not news.
   *
   * Optional rather than required, and read defensively at every use. The API
   * omits null fields rather than sending them, and a till that renders
   * `notices.length` against an absent field throws — which on this screen
   * would unmount the confirmation in front of a paying customer. See the note
   * on `apiFetch` about exactly that failure.
   */
  stockNotices?: StockNotice[] | null;
}

/**
 * A warning the till shows the moment a sale crosses a stock threshold.
 *
 * <p>This is the till's most useful notification, and the reason it is worth
 * more than the standing list in the bell: it arrives at the one moment the
 * cashier can act on it — while they are still holding the stock, with the
 * customer in front of them who might want the rest of it.
 *
 * <p>Raised only on the crossing, never on the state. A sale that takes a line
 * from six to five warns; the next sale, from five to four, does not. A shop
 * that is short of several things would otherwise put a warning on every single
 * transaction, and a warning on every transaction is one a cashier taps past
 * without reading.
 */
export interface StockNotice {
  productId: string;
  sku: string;
  name: string;
  /** "bags", "pcs" — so the message counts in the shop's own words. */
  unit: string;
  /** Units left after this sale. */
  remaining: number;
  reorderLevel: number;
  /** Nothing left at all, which is a different message and a different colour. */
  soldOut: boolean;
}

/**
 * The till's own notification feed.
 *
 * <p>Declared here rather than imported from the notifications module: feature
 * modules do not import from one another, and the two feeds are not the same
 * thing. The portal's carries voided sales and everything the owner oversees;
 * this one carries only what the person at the counter can act on.
 */
export type TillAlertKind = "OUT_OF_STOCK" | "LOW_STOCK";

export interface TillAlert {
  id: string;
  kind: TillAlertKind;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  detail: string;
  occurredAt: string;
  /** Whether it changed since this cashier last opened the panel. */
  unread: boolean;
  entityType: "PRODUCT" | "SALE";
  entityId: string;
}

export interface TillAlertFeed {
  items: TillAlert[];
  /**
   * The badge on the bell, sent by the API rather than counted from the rows:
   * the panel shows a capped list, and counting what is on screen would
   * under-report the moment the cap bites.
   */
  unreadCount: number;
  generatedAt: string;
}

/**
 * What the checkout action gives back.
 *
 * A result rather than a thrown error: a refused sale is an ordinary event at a
 * counter — the last bag of cement went to the other till — and it has to render
 * as a message the cashier can act on, not a crashed page.
 */
export type CheckoutResult =
  | { success: true; sale: CompletedSale }
  | { success: false; message: string };
