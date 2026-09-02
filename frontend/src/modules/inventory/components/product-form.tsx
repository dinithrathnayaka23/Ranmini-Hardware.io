"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, PackagePlus, Tags, Wallet } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm, useWatch, type DefaultValues } from "react-hook-form";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { SelectField, type SelectOption } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { appConfig, routes } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatCurrency, formatPercent } from "@/shared/lib/format";

import { createProduct } from "../actions";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";

/**
 * Units a hardware shop actually sells by.
 *
 * <p>Offered as suggestions on a free-text field rather than as a closed list:
 * these cover the shelves today, but a shop that starts selling by the cubic
 * foot should not have to wait for a release to type it.
 */
const UNIT_SUGGESTIONS = [
  "pcs",
  "kg",
  "g",
  "m",
  "ft",
  "ltr",
  "bag",
  "box",
  "roll",
  "sheet",
  "pair",
  "set",
  "tin",
  "packet",
];

const UNITS_LIST_ID = "product-unit-suggestions";

const BLANK: DefaultValues<ProductFormValues> = {
  sku: "",
  name: "",
  brand: "",
  categoryId: "",
  unit: "pcs",
  // Left empty rather than defaulted to zero: a price of nothing should be a
  // deliberate entry, not something a distracted shopkeeper can save by
  // skipping the field.
  buyingPrice: undefined,
  sellingPrice: undefined,
  openingStock: 0,
  reorderLevel: 0,
  imageUrl: "",
};

/**
 * Creates a catalogue entry.
 *
 * <p>Grouped into three panels — what the thing is, what it costs, and how much
 * of it there is — because that is the order the information arrives in when
 * somebody is unpacking a delivery with the invoice in their other hand.
 *
 * <p>Stock is asked for once here and never edited from a form again: after
 * this, every movement is a recorded adjustment with a reason, so a correction
 * cannot silently overwrite a sale that landed a moment earlier.
 */
export function ProductForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const categoryOptions: SelectOption[] = React.useMemo(
    () => [
      // An empty first option means the select opens on nothing rather than
      // silently pre-selecting whichever category happens to sort first — which
      // is how a bag of cement ends up filed under Electrical.
      { value: "", label: "Select a category" },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setFocus,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: BLANK,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const buyingPrice = useWatch({ control, name: "buyingPrice" });
  const sellingPrice = useWatch({ control, name: "sellingPrice" });

  const onSubmit = async (values: ProductFormValues) => {
    setNotice(null);

    const result = await createProduct(values);
    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    if (result.success) {
      // The category and the unit are carried over deliberately. Products
      // arrive by the box from one supplier, so the next entry is nearly always
      // the same kind of thing — re-picking the category every time is the sort
      // of friction that makes people stop using the screen.
      reset({ ...BLANK, categoryId: values.categoryId, unit: values.unit });
      setFocus("sku");
    }
  };

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      {notice ? (
        <div className="space-y-2">
          <Alert tone={notice.tone} message={notice.message} />
          {notice.tone === "success" ? (
            <p className="text-sm text-muted">
              The form is ready for the next one, or{" "}
              <Link
                href={routes.adminInventory}
                className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
              >
                open the catalogue
              </Link>{" "}
              to see it in the list.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ---------------------------- What it is ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Tags aria-hidden className="size-[18px] text-brand-600" />
            Product Details
          </CardTitle>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="SKU"
              placeholder="e.g. CEM-50KG"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
              // Shown upper case because that is how the backend stores it;
              // letting the field disagree with the record is a small lie the
              // shopkeeper only discovers on the shelf label.
              className="uppercase"
              error={errors.sku?.message}
              {...register("sku")}
            />

            <TextField
              label="Product Name"
              placeholder="e.g. Portland Cement 50kg"
              autoComplete="off"
              maxLength={160}
              error={errors.name?.message}
              {...register("name")}
            />

            <TextField
              label="Brand (optional)"
              placeholder="e.g. Tokyo Super"
              autoComplete="off"
              maxLength={80}
              error={errors.brand?.message}
              {...register("brand")}
            />

            <SelectField
              label="Category"
              options={categoryOptions}
              error={errors.categoryId?.message}
              {...register("categoryId")}
            />

            <TextField
              label="Sold By"
              placeholder="pcs"
              autoComplete="off"
              maxLength={16}
              list={UNITS_LIST_ID}
              error={errors.unit?.message}
              {...register("unit")}
            />

            <TextField
              label="Image Path (optional)"
              placeholder="/images/products/cement.jpg"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={512}
              error={errors.imageUrl?.message}
              {...register("imageUrl")}
            />
          </div>

          {/* Suggestions only — the field stays free text. */}
          <datalist id={UNITS_LIST_ID}>
            {UNIT_SUGGESTIONS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          <p className="text-xs leading-relaxed text-muted">
            Product photographs live in{" "}
            <code className="rounded bg-canvas-subtle px-1 py-0.5">
              public/images/products/
            </code>{" "}
            and are referenced by path. Leave it blank and the till shows a plain
            tile, which is better than a broken picture at the counter.
          </p>
        </CardBody>
      </Card>

      {/* ----------------------------- Pricing ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Wallet aria-hidden className="size-[18px] text-brand-600" />
            Pricing
          </CardTitle>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={`Buying Price (${appConfig.currencySymbol})`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.buyingPrice?.message}
              {...register("buyingPrice", { valueAsNumber: true })}
            />

            <TextField
              label={`Selling Price (${appConfig.currencySymbol})`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.sellingPrice?.message}
              {...register("sellingPrice", { valueAsNumber: true })}
            />
          </div>

          <MarginHint buyingPrice={buyingPrice} sellingPrice={sellingPrice} />
        </CardBody>
      </Card>

      {/* ------------------------------ Stock ------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Boxes aria-hidden className="size-[18px] text-brand-600" />
            Opening Stock
          </CardTitle>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Quantity On Hand"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              error={errors.openingStock?.message}
              {...register("openingStock", { valueAsNumber: true })}
            />

            <TextField
              label="Reorder Level"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              error={errors.reorderLevel?.message}
              {...register("reorderLevel", { valueAsNumber: true })}
            />
          </div>

          <p className="text-xs leading-relaxed text-muted">
            The reorder level is the point at which this product starts showing
            as low stock on the dashboard. After today, quantity changes are
            recorded as stock adjustments with a reason rather than edited here,
            so a correction can never quietly overwrite a sale.
          </p>
        </CardBody>
      </Card>

      {/* ----------------------------- Actions ------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="md" isLoading={isSubmitting} loadingText="Saving…">
          <PackagePlus aria-hidden className="size-4" />
          Add Product
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          // Nothing to clear until something has been typed, and a live Clear
          // button on an untouched form is just noise.
          disabled={!isDirty || isSubmitting}
          onClick={() => {
            reset(BLANK);
            setNotice(null);
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}

/**
 * What the shop makes on this line, shown as the two prices are typed.
 *
 * <p>Selling below cost is allowed — clearance is a real thing a shop does, and
 * the backend permits it — so this is information rather than a validation
 * error. It is still worth flagging, because the common cause is a slipped
 * decimal point rather than a deliberate markdown.
 */
function MarginHint({
  buyingPrice,
  sellingPrice,
}: {
  buyingPrice: number | undefined;
  sellingPrice: number | undefined;
}) {
  // An untouched field is undefined and an emptied one reads back as NaN;
  // neither is worth reporting a margin on, and nor is a giveaway.
  if (buyingPrice === undefined || sellingPrice === undefined) return null;
  if (!Number.isFinite(buyingPrice) || !Number.isFinite(sellingPrice)) return null;
  if (sellingPrice <= 0) return null;

  const profit = sellingPrice - buyingPrice;
  const isLoss = profit < 0;

  return (
    <p
      className={cn(
        "rounded-lg border px-3.5 py-3 text-sm",
        isLoss
          ? "border-danger/25 bg-danger-soft text-danger"
          : "border-line bg-canvas-subtle text-ink-soft",
      )}
    >
      {isLoss ? (
        <>
          This sells <strong className="font-semibold">below cost</strong> — a
          loss of {formatCurrency(Math.abs(profit), appConfig.currencySymbol)} per{" "}
          unit. Fine for clearance; check the decimal point otherwise.
        </>
      ) : (
        <>
          Margin{" "}
          <strong className="font-semibold text-ink">
            {formatCurrency(profit, appConfig.currencySymbol)}
          </strong>{" "}
          per unit, {formatPercent(profit / sellingPrice)} of the selling price.
        </>
      )}
    </p>
  );
}
