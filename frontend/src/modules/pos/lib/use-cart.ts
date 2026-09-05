"use client";

import * as React from "react";

import { calculateTotals, clampDiscountPercent } from "./cart";
import type { OrderLine, OrderTotals, PosProduct } from "../types/pos.types";

/**
 * State of the order a cashier is currently building.
 *
 * A reducer rather than a handful of `useState` calls: every action here has to
 * respect the same rule — a line may never exceed the stock on hand — and
 * keeping that rule in one place is what stops it being forgotten in whichever
 * handler is added next.
 */

interface CartState {
  lines: OrderLine[];
  discountPercent: number;
}

type CartAction =
  | { type: "ADD"; product: PosProduct }
  | { type: "INCREMENT"; productId: string }
  | { type: "DECREMENT"; productId: string }
  | { type: "SET_QUANTITY"; productId: string; quantity: number }
  | { type: "SET_DISCOUNT"; percent: number }
  | { type: "CLEAR" };

const emptyCart: CartState = { lines: [], discountPercent: 0 };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const { product } = action;

      // Selling stock that is not there is the one mistake a till must not
      // make: it turns into a customer waiting for an item nobody has.
      if (product.stock <= 0) return state;

      const existing = state.lines.find(
        (line) => line.productId === product.id,
      );

      if (!existing) {
        return {
          ...state,
          lines: [
            ...state.lines,
            {
              productId: product.id,
              sku: product.sku,
              name: product.name,
              unitPrice: product.unitPrice,
              quantity: 1,
              availableStock: product.stock,
            },
          ],
        };
      }

      return { ...state, lines: adjust(state.lines, product.id, 1) };
    }

    case "INCREMENT":
      return { ...state, lines: adjust(state.lines, action.productId, 1) };

    case "DECREMENT": {
      const lines = adjust(state.lines, action.productId, -1);
      // Stepping the last unit off a line removes it, rather than leaving a
      // zero-quantity row the cashier then has to delete separately. This is
      // also the only way to drop a line, which is why the row shows a bin
      // icon on the minus button once the quantity reaches one.
      return { ...state, lines: lines.filter((line) => line.quantity > 0) };
    }

    /**
     * A quantity typed rather than stepped to.
     *
     * <p>Expressed as a delta so it goes through the same {@link adjust} cap as
     * every other route to a quantity — the rule that a line may never exceed
     * the stock on hand has to hold however the number got there.
     *
     * <p>Zero and below are ignored rather than removing the line. Emptying a
     * box while retyping a number passes through zero on the way, and a line
     * that vanished mid-keystroke would be a worse surprise than a "1" the
     * cashier has to correct. Removing a line stays the bin button, which says
     * so.
     */
    case "SET_QUANTITY": {
      if (!Number.isFinite(action.quantity) || action.quantity < 1) return state;

      const line = state.lines.find((item) => item.productId === action.productId);
      if (!line) return state;

      return {
        ...state,
        lines: adjust(state.lines, action.productId, action.quantity - line.quantity),
      };
    }

    case "SET_DISCOUNT":
      return { ...state, discountPercent: clampDiscountPercent(action.percent) };

    case "CLEAR":
      return emptyCart;
  }
}

/** Applies a quantity delta to one line, capped at the stock on hand. */
function adjust(
  lines: OrderLine[],
  productId: string,
  delta: number,
): OrderLine[] {
  return lines.map((line) =>
    line.productId === productId
      ? {
          ...line,
          quantity: Math.min(
            Math.max(line.quantity + delta, 0),
            line.availableStock,
          ),
        }
      : line,
  );
}

export interface Cart {
  lines: OrderLine[];
  discountPercent: number;
  totals: OrderTotals;
  isEmpty: boolean;
  /** True when a line is already holding every unit on hand. */
  isAtStockCeiling: (productId: string) => boolean;
  add: (product: PosProduct) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  /** Sets a line's quantity outright, capped at the stock on hand. */
  setQuantity: (productId: string, quantity: number) => void;
  setDiscountPercent: (percent: number) => void;
  clear: () => void;
}

/**
 * @param taxRate the shop's tax percentage, from Settings → Business Logic.
 *   Passed in rather than read from context here, because it is the one input
 *   to this hook that changes what the customer is charged: an accidental
 *   default of zero would put the till back to quoting a price below the one
 *   the server takes, which is the bug this parameter exists to close.
 */
export function useCart(taxRate: number): Cart {
  const [state, dispatch] = React.useReducer(cartReducer, emptyCart);

  const totals = React.useMemo(
    () => calculateTotals(state.lines, state.discountPercent, taxRate),
    [state.lines, state.discountPercent, taxRate],
  );

  return {
    lines: state.lines,
    discountPercent: state.discountPercent,
    totals,
    isEmpty: state.lines.length === 0,
    isAtStockCeiling: (productId) => {
      const line = state.lines.find((item) => item.productId === productId);
      return line ? line.quantity >= line.availableStock : false;
    },
    add: (product) => dispatch({ type: "ADD", product }),
    increment: (productId) => dispatch({ type: "INCREMENT", productId }),
    decrement: (productId) => dispatch({ type: "DECREMENT", productId }),
    setQuantity: (productId, quantity) =>
      dispatch({ type: "SET_QUANTITY", productId, quantity }),
    setDiscountPercent: (percent) =>
      dispatch({ type: "SET_DISCOUNT", percent }),
    clear: () => dispatch({ type: "CLEAR" }),
  };
}
