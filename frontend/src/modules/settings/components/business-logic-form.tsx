"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";

import { SETTINGS_FORM_ID } from "../constants/settings-sections";
import { saveBusinessLogic } from "../actions";
import { useSectionSave } from "../lib/use-section-save";
import {
  businessLogicSchema,
  type BusinessLogicValues,
} from "../schemas/settings.schema";
import { SettingsPanel } from "./settings-panel";

const CURRENCY_OPTIONS = [
  { value: "Rs.", label: "Sri Lankan Rupee (Rs.)" },
  { value: "$", label: "US Dollar ($)" },
] as const;

/**
 * Tax rates, low stock thresholds and operational defaults.
 *
 * <p>Every field here is now read by something: the tax rate is charged at
 * checkout and previewed on the till, the currency is printed everywhere an
 * amount appears, and the low stock threshold seeds the reorder level on a new
 * product.
 *
 * <p>Stock valuation is the exception, and is shown rather than chosen. It
 * offered weighted average and FIFO and neither was implemented; weighted
 * average now is, and FIFO is not offered because it would need a cost layer
 * stored per delivery and consumed in order on every sale. A dropdown whose
 * second option does nothing is worse than a sentence saying what happens.
 */
export function BusinessLogicForm({
  defaults,
}: {
  defaults: BusinessLogicValues;
}) {
  const { notice, save, isSaving } = useSectionSave<BusinessLogicValues>(saveBusinessLogic);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessLogicValues>({
    resolver: zodResolver(businessLogicSchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <SettingsPanel
      isSaving={isSaving}
      title="Business Logic"
      description="Tax rates, low stock thresholds, and operational defaults."
    >
      <form
        id={SETTINGS_FORM_ID}
        onSubmit={handleSubmit(save)}
        noValidate
        className="space-y-6"
      >
        {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Tax Rate (%)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={100}
            error={errors.taxRate?.message}
            {...register("taxRate", { valueAsNumber: true })}
          />

          <TextField
            label="Low Stock Threshold (units)"
            type="number"
            inputMode="numeric"
            step="1"
            min={1}
            error={errors.lowStockThreshold?.message}
            {...register("lowStockThreshold", { valueAsNumber: true })}
          />

          {/*
            This control is the single source of truth for the currency symbol
            shown across the portal. The supplied designs disagreed — inventory
            and reports used "$", the dashboard used "Rs." — so it is settled
            here rather than hard-coded per screen.
          */}
          <SelectField
            label="Currency"
            options={CURRENCY_OPTIONS}
            error={errors.currencySymbol?.message}
            {...register("currencySymbol")}
          />

          {/*
            Registered but not rendered as a control: the form still submits the
            field, because the endpoint requires it, but there is nothing to
            choose. `type="hidden"` rather than a disabled select, so nothing
            looks interactive that is not.
          */}
          <input type="hidden" {...register("stockValuation")} />

          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-ink">Stock Valuation Method</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Weighted average cost. When a delivery is recorded with a price,
              the product&rsquo;s cost becomes the average of what is now on the
              shelf — the stock already held at its old cost, plus what arrived
              at the new one. Margins and profit then follow what the shop
              actually paid.
            </p>
          </div>
        </div>
      </form>
    </SettingsPanel>
  );
}
