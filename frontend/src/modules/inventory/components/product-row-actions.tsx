"use client";

import { PackageMinus, PackagePlus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { TextField } from "@/shared/components/ui/text-field";

import { useCurrency } from "@/shared/components/shop-provider";

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

  const currency = useCurrency();
  const [delta, setDelta] = React.useState("");
  const [reason, setReason] = React.useState("");
  /**
   * What the shop paid per unit on this delivery, as typed.
   *
   * <p>Kept as a string so an empty box stays empty rather than becoming zero —
   * "this delivery cost nothing" and "I am not recording a cost" are different
   * statements, and only the second should leave the product's cost alone.
   */
  const [unitCost, setUnitCost] = React.useState("");
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

  const isDelivery = hasDelta && parsedDelta > 0;

  /**
   * What the product's cost becomes if this delivery is recorded at this price.
   *
   * <p>Shown before saving, because a weighted average is not a figure anybody
   * computes in their head, and a cost that silently moved would be discovered
   * later as a margin that looks wrong. Null whenever there is nothing to say —
   * no delivery, or no price typed.
   *
   * <p>The backend computes the stored value; this mirrors its rule for the
   * preview only, the same way the till previews a total the server recomputes.
   */
  const parsedCost = Number.parseFloat(unitCost);
  const newAverage =
    isDelivery && Number.isFinite(parsedCost) && parsedCost >= 0
      ? Math.round(
          ((product.stock * product.buyingPrice + parsedDelta * parsedCost) /
            (product.stock + parsedDelta)) *
            100,
        ) / 100
      : null;

  const handleAdjust = async () => {
    setIsPending(true);
    const result = await adjustStock(product.id, {
      delta: parsedDelta,
      reason,
      // Undefined rather than zero when the box is empty: a correction is not a
      // purchase and must not reprice the shelf.
      unitCost: unitCost.trim() === "" ? undefined : Number(unitCost),
    });
    setIsPending(false);

    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    if (result.success) {
      setDelta("");
      setReason("");
      setUnitCost("");
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

          {/*
            Only for a delivery. A negative movement removes units at whatever
            they cost and does not change the price of what is left, so showing
            a cost box beside "-3 broken" would invite an entry that the backend
            correctly ignores.
          */}
          {isDelivery ? (
            <div className="grid gap-3 sm:grid-cols-[14rem_1fr] sm:items-start">
              <TextField
                label={`Cost per ${product.unit} (${currency})`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={String(product.buyingPrice.toFixed(2))}
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
              />

              <p className="text-xs leading-relaxed text-muted sm:pt-7">
                {newAverage === null ? (
                  <>
                    Optional. Fill it in when this is a delivery and the price
                    has changed — the product&rsquo;s cost becomes the weighted
                    average of what is then on the shelf. Leave it blank for a
                    stocktake correction.
                  </>
                ) : (
                  <>
                    Cost moves from{" "}
                    <strong className="text-ink">
                      {currency} {product.buyingPrice.toFixed(2)}
                    </strong>{" "}
                    to{" "}
                    <strong className="text-ink">
                      {currency} {newAverage.toFixed(2)}
                    </strong>{" "}
                    — the {product.stock} {product.unit} already held at the old
                    cost, plus {parsedDelta} at the new one.
                  </>
                )}
              </p>
            </div>
          ) : null}

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
