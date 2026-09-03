/**
 * Completed sales, as the back office reads them.
 *
 * <p>Deliberately a separate type from the till's `CompletedSale`. The two
 * describe the same document but are read for different reasons — the till
 * shows the sale it has just made, this shows one somebody is looking up
 * afterwards — and feature modules do not import from one another. What they
 * genuinely share is the receipt layout, which is promoted to
 * `shared/components/receipt/` for exactly that reason; a `Sale` here is
 * structurally a `ReceiptSale`, so it prints without a conversion.
 */

export type TenderMethod = "CASH" | "CARD";

export type SaleStatus = "COMPLETED" | "VOIDED";

/**
 * One line of a receipt. No cost and no margin: a customer holds this.
 *
 * <p>Structurally the same as the shared `ReceiptLine`, which is what lets a
 * sale from this module be printed by the shared receipt without a conversion.
 */
export interface SaleLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  /** The trading day, ISO. May differ from the timestamp near midnight. */
  businessDate: string;
  soldAt: string;
  cashierName: string | null;
  terminalName: string | null;
  lines: SaleLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  tender: TenderMethod;
  /** Cash handed over; null for a card payment. */
  amountTendered: number | null;
  changeDue: number;
  status: SaleStatus;
  voidReason: string | null;
}

/** One page of sales, with the paging state the footer renders. */
export interface SalesPage {
  sales: Sale[];
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}

/** A day's pre-aggregated figures, from the reporting module's endpoint. */
export interface DayTotals {
  date: string;
  transactions: number;
  unitsSold: number;
  revenue: number;
  profit: number;
  discountTotal: number;
}
