"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";

import { SETTINGS_FORM_ID } from "../constants/settings-sections";
import { usePendingSave } from "../lib/use-pending-save";
import {
  businessLogicSchema,
  type BusinessLogicValues,
} from "../schemas/settings.schema";
import { SettingsPanel } from "./settings-panel";

const CURRENCY_OPTIONS = [
  { value: "Rs.", label: "Sri Lankan Rupee (Rs.)" },
  { value: "$", label: "US Dollar ($)" },
] as const;

const VALUATION_OPTIONS = [
  { value: "WEIGHTED_AVERAGE", label: "Weighted average cost" },
  { value: "FIFO", label: "First in, first out (FIFO)" },
] as const;

/**
 * Tax rates, low stock thresholds and operational defaults.
 *
 * NOT YET PERSISTED — see the note on the shop profile form.
 */
export function BusinessLogicForm({
  defaults,
}: {
  defaults: BusinessLogicValues;
}) {
  const { notice, reportValid } = usePendingSave("Business logic");

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
      title="Business Logic"
      description="Tax rates, low stock thresholds, and operational defaults."
    >
      <form
        id={SETTINGS_FORM_ID}
        onSubmit={handleSubmit(reportValid)}
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

          <SelectField
            label="Stock Valuation Method"
            options={VALUATION_OPTIONS}
            error={errors.stockValuation?.message}
            {...register("stockValuation")}
          />
        </div>
      </form>
    </SettingsPanel>
  );
}
