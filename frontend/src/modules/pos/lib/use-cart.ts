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
  setDiscountPercent: (percent: number) => void;
  clear: () => void;
}

export function useCart(): Cart {
  const [state, dispatch] = React.useReducer(cartReducer, emptyCart);

  const totals = React.useMemo(
    () => calculateTotals(state.lines, state.discountPercent),
    [state.lines, state.discountPercent],
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
    setDiscountPercent: (percent) =>
      dispatch({ type: "SET_DISCOUNT", percent }),
    clear: () => dispatch({ type: "CLEAR" }),
  };
}
