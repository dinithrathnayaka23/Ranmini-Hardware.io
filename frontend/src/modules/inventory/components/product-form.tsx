"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Camera, PackagePlus, Save, Tags, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useCurrency } from "@/shared/components/shop-provider";
import { routes } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { productImageUrl } from "@/shared/lib/product-image-url";

import { createProduct, updateProduct, uploadProductImage } from "../actions";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import type { Product } from "../types/inventory.types";

import { ProductImageField } from "./product-image-field";

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
};

/**
 * Creates or edits a catalogue entry.
 *
 * <p>One form for both, because they are the same fields and a second copy is a
 * second place for a validation rule to drift. What differs is stated in one
 * place — {@link isEditing} — and amounts to three things: the button says Save
 * rather than Add, the form does not clear itself after a successful save, and
 * the stock field is read-only.
 *
 * <p><b>Stock is read-only when editing</b> because after the opening count,
 * every movement is a recorded adjustment with a reason. A plain edit that set
 * the figure would silently overwrite a sale that landed a moment earlier, and
 * would leave the stock ledger unable to account for the difference.
 *
 * <p>Grouped into panels — what the thing is, what it looks like, what it costs,
 * and how much of it there is — because that is the order the information
 * arrives in when somebody is unpacking a delivery with the invoice in their
 * other hand.
 */
export function ProductForm({
  categories,
  product,
  defaultReorderLevel = 0,
}: {
  categories: { id: string; name: string }[];
  /** The product being edited, or undefined when adding a new one. */
  product?: Product;
  /**
   * Where the reorder level starts on a new product, from Settings → Business
   * Logic.
   *
   * <p>A starting value, not a rule — which is why it seeds the field rather
   * than being applied on the server. Each product keeps its own level, because
   * a shop that reorders cement at twenty bags does not reorder washers at
   * twenty washers, and the shopkeeper can see and change it before saving.
   * Ignored when editing: that product already has a level of its own.
   */
  defaultReorderLevel?: number;
}) {
  const isEditing = product !== undefined;
  const currency = useCurrency();
  const router = useRouter();

  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  /**
   * The photograph chosen before the product exists.
   *
   * <p>Only used when adding: there is no id to upload against until the
   * product has been created, so the file waits here and is sent immediately
   * afterwards. In a ref rather than state because nothing renders from it —
   * the picker owns its own preview — and re-rendering the whole form on every
   * file choice would be work for nothing.
   */
  const pendingImage = React.useRef<File | null>(null);

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

  /** The empty form, with the shop's own reorder default already in it. */
  const blank: DefaultValues<ProductFormValues> = React.useMemo(
    () => ({ ...BLANK, reorderLevel: defaultReorderLevel }),
    [defaultReorderLevel],
  );

  const defaults: DefaultValues<ProductFormValues> = React.useMemo(() => {
    if (!product) return blank;

    return {
      sku: product.sku,
      name: product.name,
      brand: product.brand ?? "",
      categoryId: product.categoryId,
      unit: product.unit,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      // Sent back unchanged. The API takes the same shape for a create and an
      // update and ignores this field on an update, so echoing the current
      // figure is both honest and inert.
      openingStock: product.stock,
      reorderLevel: product.reorderLevel,
    };
  }, [product, blank]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setFocus,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const buyingPrice = useWatch({ control, name: "buyingPrice" });
  const sellingPrice = useWatch({ control, name: "sellingPrice" });

  const onSubmit = async (values: ProductFormValues) => {
    setNotice(null);

    if (isEditing) {
      const result = await updateProduct(product.id, values);
      setNotice({ tone: result.success ? "success" : "danger", message: result.message });

      // The server data this form was seeded from has changed; without this the
      // page would keep rendering the figures it was opened with.
      if (result.success) router.refresh();
      return;
    }

    const result = await createProduct(values);

    if (!result.success) {
      setNotice({ tone: "danger", message: result.message });
      return;
    }

    // The product exists now, so the photograph chosen earlier has something to
    // attach to. Reported separately on failure: the product was still created,
    // and saying "could not save" would send somebody back to add it twice.
    let message = result.message;

    if (pendingImage.current && result.productId) {
      const data = new FormData();
      data.append("file", pendingImage.current);
      const upload = await uploadProductImage(result.productId, data);

      if (!upload.success) {
        message = `${result.message} The photograph could not be saved — ${upload.message}`;
      }
      pendingImage.current = null;
    }

    setNotice({ tone: "success", message });

    // The category and the unit are carried over deliberately. Products arrive
    // by the box from one supplier, so the next entry is nearly always the same
    // kind of thing — re-picking the category every time is the sort of friction
    // that makes people stop using the screen.
    reset({ ...blank, categoryId: values.categoryId, unit: values.unit });
    setFocus("sku");
  };

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      /*
        Two columns from `xl`, one below it.

        Stacked, this form is about a thousand pixels tall — slightly more than
        a 1080p laptop leaves once the browser chrome and the top bar are taken
        off. That produced the worst possible amount of scrolling: a short drag
        into a mostly empty strip at the bottom, on a screen whose entire right
        half was blank. Pairing the cards up fits the whole form in the viewport
        at laptop sizes and spends the empty width on something.

        `items-start` matters: without it the grid stretches both cards in a row
        to match the taller one, padding the shorter with the same dead space
        this is meant to remove.
      */
      className="grid gap-5 xl:grid-cols-2 xl:items-start"
    >
      {notice ? (
        <div className="space-y-2 xl:col-span-2">
          <Alert tone={notice.tone} message={notice.message} />
          {notice.tone === "success" && !isEditing ? (
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
          </div>

          {/* Suggestions only — the field stays free text. */}
          <datalist id={UNITS_LIST_ID}>
            {UNIT_SUGGESTIONS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </CardBody>
      </Card>

      {/* --------------------------- Photograph ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Camera aria-hidden className="size-[18px] text-brand-600" />
            Photograph
          </CardTitle>
        </CardHeader>

        <CardBody>
          <ProductImageField
            productId={product?.id ?? null}
            storedUrl={product ? productImageUrl(product) : null}
            onFileChange={(file) => {
              pendingImage.current = file;
            }}
          />
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
              label={`Buying Price (${currency})`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.buyingPrice?.message}
              {...register("buyingPrice", { valueAsNumber: true })}
            />

            <TextField
              label={`Selling Price (${currency})`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.sellingPrice?.message}
              {...register("sellingPrice", { valueAsNumber: true })}
            />
          </div>

          <MarginHint
            buyingPrice={buyingPrice}
            sellingPrice={sellingPrice}
            currency={currency}
          />
        </CardBody>
      </Card>

      {/* ------------------------------ Stock ------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Boxes aria-hidden className="size-[18px] text-brand-600" />
            {isEditing ? "Stock" : "Opening Stock"}
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
              // Read-only rather than hidden while editing: the figure is worth
              // seeing beside the reorder level, it just must not be typed over.
              readOnly={isEditing}
              className={isEditing ? "bg-canvas-subtle text-muted" : undefined}
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
            {isEditing ? (
              <>
                Stock is not edited here. Every movement after the opening count
                is a recorded adjustment with a reason — a delivery, a stocktake,
                breakage — so a correction can never quietly overwrite a sale.
                Use <strong className="font-semibold">Adjust stock</strong> on the
                catalogue row.
              </>
            ) : (
              <>
                The reorder level is the point at which this product starts
                showing as low stock on the dashboard.
                {defaultReorderLevel > 0 ? (
                  <>
                    {" "}
                    It starts at {defaultReorderLevel} from Settings → Business
                    Logic; change it for anything that sells faster or slower
                    than the rest of the shelf.
                  </>
                ) : null}{" "}
                After today, quantity changes are recorded as stock adjustments
                with a reason rather than edited here, so a correction can never
                quietly overwrite a sale.
              </>
            )}
          </p>
        </CardBody>
      </Card>

      {/* ----------------------------- Actions ------------------------------ */}
      <div className="flex flex-wrap items-center gap-3 xl:col-span-2">
        <Button
          type="submit"
          size="md"
          isLoading={isSubmitting}
          loadingText="Saving…"
        >
          {isEditing ? (
            <>
              <Save aria-hidden className="size-4" />
              Save Changes
            </>
          ) : (
            <>
              <PackagePlus aria-hidden className="size-4" />
              Add Product
            </>
          )}
        </Button>

        {isEditing ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onClick={() => {
              reset(defaults);
              setNotice(null);
            }}
          >
            Discard changes
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            // Nothing to clear until something has been typed, and a live Clear
            // button on an untouched form is just noise.
            disabled={!isDirty || isSubmitting}
            onClick={() => {
              reset(blank);
              pendingImage.current = null;
              setNotice(null);
            }}
          >
            Clear
          </Button>
        )}
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
  currency,
}: {
  buyingPrice: number | undefined;
  sellingPrice: number | undefined;
  currency: string;
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
          loss of {formatCurrency(Math.abs(profit), currency)} per unit. Fine for
          clearance; check the decimal point otherwise.
        </>
      ) : (
        <>
          Margin{" "}
          <strong className="font-semibold text-ink">
            {formatCurrency(profit, currency)}
          </strong>{" "}
          per unit, {formatPercent(profit / sellingPrice)} of the selling price.
        </>
      )}
    </p>
  );
}
