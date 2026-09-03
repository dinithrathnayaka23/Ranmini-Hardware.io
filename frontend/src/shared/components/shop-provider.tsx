"use client";

import * as React from "react";

import { appConfig } from "@/shared/config/app.config";
import type { ShopSettings } from "@/shared/lib/shop.server";

/**
 * Makes the shop's own settings — its currency above all — available to the
 * client components that format money.
 *
 * <p>Context rather than props. Roughly a dozen components across the till, the
 * inventory table and the reports all print an amount, most of them several
 * layers below the page that could fetch the setting; threading a symbol
 * through every one of those layers would be a prop that exists solely to be
 * passed on again.
 *
 * <p>The value is read on the server and handed to the provider, so no client
 * component ever fetches it. That keeps the symbol present in the first paint
 * rather than appearing a moment after the prices do.
 *
 * <p><b>Type note:</b> the {@link ShopSettings} type is imported from a
 * `server-only` module, which is safe because a type import is erased at
 * compile time and never becomes a runtime dependency on that module.
 */

const ShopContext = React.createContext<ShopSettings | null>(null);

export function ShopProvider({
  settings,
  children,
}: {
  settings: ShopSettings;
  children: React.ReactNode;
}) {
  // The object identity is stable for as long as the server render that
  // produced it, so consumers do not re-render on every parent update.
  const value = React.useMemo(() => settings, [settings]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

/**
 * The shop's settings, for a client component.
 *
 * <p>Returns null outside a provider rather than throwing. A component that
 * formats a price is not the right place to crash a page over missing chrome,
 * and {@link useCurrency} below turns that null into the build-time default.
 */
export function useShop(): ShopSettings | null {
  return React.useContext(ShopContext);
}

/**
 * The currency symbol to print prices with.
 *
 * <p>Falls back to the build-time default outside a provider, which is what
 * makes this safe to call from a component that might be rendered in isolation
 * — a test, or a screen that has not been wrapped yet.
 */
export function useCurrency(): string {
  return useShop()?.currencySymbol ?? appConfig.currencySymbol;
}
