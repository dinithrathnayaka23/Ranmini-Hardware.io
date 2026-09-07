/**
 * What a receipt needs to know about a sale.
 *
 * <p>Lives in `shared/` because two feature modules print one: the till, from
 * the sale it has just completed, and the back office, from a sale somebody has
 * looked up. Modules never import from one another, so the shape they both
 * depend on is promoted here — which is also the honest description of it, since
 * a receipt is a document rather than a feature of either screen.
 *
 * <p>Deliberately the *printed* subset. There is no cost, no margin and no
 * cashier id: a customer holds this piece of paper, and a field that is never
 * serialised into the type cannot be printed onto it by accident.
 */

export interface ReceiptLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ReceiptSale {
  invoiceNumber: string;
  soldAt: string;
  cashierName?: string | null;
  terminalName?: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  tender: "CASH" | "CARD";
  /**
   * Cash handed over, or absent when none was recorded.
   *
   * <p>Optional as well as nullable, and that is not pedantry: the API is
   * configured to omit null fields rather than send them, so this key is simply
   * missing on a card sale or on cash paid exactly. Typing it as `number | null`
   * told every call site it could rely on a null it would never actually see.
   */
  amountTendered?: number | null;
  changeDue: number;
  status: "COMPLETED" | "VOIDED";
  /**
   * Why the sale was cancelled, printed under the VOIDED stamp.
   *
   * <p>Optional because a sale straight off the till has no such field — it was
   * completed a second ago — while one read back from the ledger may.
   */
  voidReason?: string | null;
}
