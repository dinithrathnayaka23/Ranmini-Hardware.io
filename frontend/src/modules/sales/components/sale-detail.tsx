"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";

import { PrintReceiptButton } from "@/shared/components/receipt/print-receipt-button";
import { Receipt } from "@/shared/components/receipt/receipt";

import { voidSale } from "../actions";
import type { Sale } from "../types/sales.types";

/**
 * One receipt, opened from the day's list.
 *
 * <p>Shows the receipt as it printed — the same component that goes to the
 * thermal roll — beside the two things an administrator can do with it: print
 * another copy, or void it.
 *
 * <p><b>Voiding asks for a reason before it will do anything.</b> A void returns
 * stock to the shelf and takes money out of the day's takings, so it is a
 * correction to the ledger rather than a tidy-up: the reason is stored on the
 * receipt itself, prints on any copy made afterwards, and is what the owner
 * reads in the notification that follows. A confirmation dialog would be easier
 * to click through and would leave nothing behind.
 */
export function SaleDetail({ sale: initial }: { sale: Sale }) {
  const router = useRouter();

  // The sale is held in state so a void updates this panel immediately, rather
  // than waiting for the server data behind the list to be re-read.
  const [sale, setSale] = React.useState(initial);
  const [isVoiding, setIsVoiding] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(
    null,
  );

  React.useEffect(() => {
    setSale(initial);
  }, [initial]);

  const handleVoid = async () => {
    setIsPending(true);
    const result = await voidSale(sale.id, { reason });
    setIsPending(false);

    if (!result.success) {
      setNotice({ tone: "danger", message: result.message });
      return;
    }

    setSale(result.sale);
    setNotice({ tone: "success", message: result.message });
    setIsVoiding(false);
    setReason("");

    // The list above still shows this sale as completed, and the day's totals
    // above that still count it.
    router.refresh();
  };

  const isVoided = sale.status === "VOIDED";

  return (
    <div className="grid gap-5 border-l-2 border-brand-600 bg-canvas-subtle px-5 py-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      {/* The receipt, as paper. Bordered and shadowed so it reads as a document
          on screen without changing what actually prints. */}
      <div className="overflow-x-auto">
        <div className="w-fit rounded-md border border-line bg-white p-2 shadow-sm">
          <Receipt sale={sale} />
        </div>
      </div>

      <div className="space-y-3">
        {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

        {isVoided ? (
          <div className="rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3">
            <p className="text-sm font-semibold text-danger">This sale was voided</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {sale.voidReason ?? "No reason was recorded."}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              The stock went back on the shelf and the day&rsquo;s takings were
              reduced by this amount. The receipt itself is kept — the fact that
              a mistake was made and corrected is part of what an auditor needs
              to see.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <PrintReceiptButton sale={sale} label="Print a copy" />

          {!isVoided && !isVoiding ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsVoiding(true);
                setNotice(null);
              }}
            >
              <Ban aria-hidden className="size-4" />
              Void this sale
            </Button>
          ) : null}
        </div>

        {isVoiding ? (
          <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
            <TextField
              label="Why is this sale being voided?"
              placeholder="Wrong item rung up, customer returned everything…"
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />

            <p className="text-xs leading-relaxed text-muted">
              The {sale.lines.reduce((units, line) => units + line.quantity, 0)}{" "}
              units on this receipt go back into stock, and the day&rsquo;s
              revenue drops by the total. This cannot be undone — a sale voided
              in error is corrected by ringing it up again.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                isLoading={isPending}
                loadingText="Voiding…"
                // The API requires a reason as well; this stops a pointless
                // round trip rather than being the check that matters.
                disabled={reason.trim().length < 10}
                onClick={handleVoid}
                className="bg-danger hover:bg-danger/90"
              >
                <Ban aria-hidden className="size-4" />
                Void sale {sale.invoiceNumber}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  setIsVoiding(false);
                  setReason("");
                }}
              >
                Keep the sale
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
