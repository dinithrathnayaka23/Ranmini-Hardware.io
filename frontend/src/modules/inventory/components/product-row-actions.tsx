"use client";

import { PackageMinus, PackagePlus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";

import { adjustStock, deactivateProduct, reactivateProduct } from "../actions";
import type { Product } from "../types/inventory.types";

/**
 * The panel that opens beneath a catalogue row.
 *
 * <p>An expanding row rather than a modal, matching how the staff screen already
 * handles the same kind of thing. It keeps the product's own figures visible
 * while they are being changed — a stock correction is much easier to get right
 * with the current count on the screen above it — and it needs no focus trap,
 * no scroll lock and no dialog library.
 *
 * <p>Both actions are deliberately a little effortful. A catalogue is a list
 * where the row above and the row below look identical, and a stray click that
 * withdrew the wrong product, or added forty of something, would be discovered
 * days later at the shelf.
 */

export type RowPanel = "stock" | "withdraw" | null;

export function ProductRowActions({
  product,
  panel,
  onClose,
}: {
  product: Product;
  panel: RowPanel;
  onClose: () => void;
}) {
  const router = useRouter();

  const [delta, setDelta] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: AlertTone; message: string } | null>(
    null,
  );

  const parsedDelta = Number.parseInt(delta, 10);
  const hasDelta = Number.isFinite(parsedDelta) && parsedDelta !== 0;

  // The figure the shelf will read after this adjustment, shown while it is
  // being typed. Somebody correcting a stocktake is thinking in totals, not in
  // deltas, and this is what turns "-3" back into an answer they can check.
  const resulting = hasDelta ? product.stock + parsedDelta : product.stock;

  const handleAdjust = async () => {
    setIsPending(true);
    const result = await adjustStock(product.id, { delta: parsedDelta, reason });
    setIsPending(false);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    if (result.success) {
      setDelta("");
      setReason("");
      // The row above still shows the old count until the server data is
      // re-read; the action revalidated the path, this applies it.
      router.refresh();
    }
  };

  const handleWithdrawal = async (withdraw: boolean) => {
    setIsPending(true);
    const result = withdraw
      ? await deactivateProduct(product.id)
      : await reactivateProduct(product.id);
    setIsPending(false);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });
    if (result.success) router.refresh();
  };

  if (panel === null) return null;

  return (
    <div className="space-y-3 border-l-2 border-brand-600 bg-canvas-subtle px-5 py-4">
      {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

      {panel === "stock" ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">
            Adjust stock for {product.name}
          </p>

          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <TextField
              label={`Change (${product.unit})`}
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="e.g. 40 or -3"
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
            />

            <TextField
              label="Reason"
              placeholder="Delivery from supplier, stocktake correction, breakage…"
              maxLength={120}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <p className="text-xs leading-relaxed text-muted">
            A signed change, not a new total: <strong>40</strong> for a delivery,{" "}
            <strong>-3</strong> for breakage. Recorded with its reason in the
            stock ledger, and applied the same way a sale is — so it cannot
            overwrite a sale that lands while this is open.
            {hasDelta ? (
              <>
                {" "}
                {product.name} would go from{" "}
                <strong className="text-ink">{product.stock}</strong> to{" "}
                <strong className={resulting < 0 ? "text-danger" : "text-ink"}>
                  {resulting}
                </strong>{" "}
                {product.unit}.
              </>
            ) : null}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              isLoading={isPending}
              loadingText="Saving…"
              // A reason is not optional: an adjustment nobody can account for
              // is the entry that makes a stocktake unresolvable.
              disabled={!hasDelta || reason.trim().length === 0 || resulting < 0}
              onClick={handleAdjust}
            >
              <PackagePlus aria-hidden className="size-4" />
              Record adjustment
            </Button>

            <Button variant="secondary" size="sm" disabled={isPending} onClick={onClose}>
              Cancel
            </Button>
          </div>

          {hasDelta && resulting < 0 ? (
            <p className="text-xs font-medium text-danger">
              That would take the stock below zero. The shelf cannot hold less
              than nothing, and the API refuses it.
            </p>
          ) : null}
        </div>
      ) : null}

      {panel === "withdraw" ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">
            {product.active
              ? `Withdraw ${product.name} from sale?`
              : `Put ${product.name} back on sale?`}
          </p>

          <p className="text-xs leading-relaxed text-muted">
            {product.active ? (
              <>
                Nothing is deleted. The product disappears from the till and its{" "}
                {product.stock} {product.unit} stop being sellable, while every
                past receipt that names it stays exactly as it was — which is
                what makes last year&rsquo;s sales still readable. You can put it
                back at any time.
              </>
            ) : (
              <>
                It will appear on the till again immediately, with the{" "}
                {product.stock} {product.unit} it still has on the shelf.
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              isLoading={isPending}
              loadingText="Working…"
              onClick={() => handleWithdrawal(product.active)}
              className={product.active ? "bg-danger hover:bg-danger/90" : undefined}
            >
              {product.active ? (
                <>
                  <PackageMinus aria-hidden className="size-4" />
                  Withdraw from sale
                </>
              ) : (
                <>
                  <RotateCcw aria-hidden className="size-4" />
                  Put back on sale
                </>
              )}
            </Button>

            <Button variant="secondary" size="sm" disabled={isPending} onClick={onClose}>
              {product.active ? "Keep on sale" : "Leave withdrawn"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
