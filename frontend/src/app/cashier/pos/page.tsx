import type { Metadata } from "next";
import { ScanBarcode } from "lucide-react";

import { PosSignOut } from "@/modules/pos/components/pos-sign-out";
import { Logo } from "@/shared/components/brand/logo";

export const metadata: Metadata = {
  title: "Point of Sale",
};

/**
 * PLACEHOLDER — `/cashier/pos`, where a cashier lands after signing in.
 *
 * The till itself has not been designed yet. This exists so the sign-in flow
 * completes somewhere honest instead of a 404 that reads as a broken login,
 * and so the session can still be ended from a shop-floor machine.
 *
 * Delete this whole file once the real point-of-sale screen lands; it lives
 * outside the `(portal)` route group deliberately, because the admin
 * navigation rail is not the cashier's chrome.
 */
export default function CashierPosPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas-subtle px-6 py-6 sm:px-10 sm:py-10">
      <header className="shrink-0">
        <Logo />
      </header>

      <main className="flex flex-1 shrink-0 flex-col items-center justify-center py-10 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-line"
        >
          <ScanBarcode className="size-6" />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
          Point of Sale
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          You are signed in. The till screen has not been built yet — it will
          appear here once the design is ready.
        </p>

        <div className="mt-8">
          <PosSignOut />
        </div>
      </main>
    </div>
  );
}
