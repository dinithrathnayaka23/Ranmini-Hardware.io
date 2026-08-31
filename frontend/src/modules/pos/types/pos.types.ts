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
   * Path to a product photo under `public/`, or null.
   *
   * Optional because a real catalogue is never fully photographed — the card
   * falls back to a neutral tile rather than a broken image.
   */
  imageUrl?: string | null;
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
  cashierName: string | null;
  terminalName: string | null;
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
  amountTendered: number | null;
  changeDue: number;
  status: "COMPLETED" | "VOIDED";
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
