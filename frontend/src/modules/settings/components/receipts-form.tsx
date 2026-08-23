"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { TextareaField } from "@/shared/components/ui/textarea-field";

import { SETTINGS_FORM_ID } from "../constants/settings-sections";
import { usePendingSave } from "../lib/use-pending-save";
import {
  receiptsSchema,
  type ReceiptsValues,
} from "../schemas/settings.schema";
import { SettingsPanel } from "./settings-panel";

const PAPER_OPTIONS = [
  { value: "80MM", label: "80mm thermal roll" },
  { value: "58MM", label: "58mm thermal roll" },
  { value: "A4", label: "A4 sheet" },
] as const;

/**
 * How printed receipts and invoices are laid out.
 *
 * NOT YET PERSISTED — see the note on the shop profile form.
 */
export function ReceiptsForm({ defaults }: { defaults: ReceiptsValues }) {
  const { notice, reportValid } = usePendingSave("Receipt");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReceiptsValues>({
    resolver: zodResolver(receiptsSchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <SettingsPanel
      title="Receipts"
      description="How printed receipts and invoices are laid out."
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
            label="Receipt Number Prefix"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            // The prefix becomes part of every invoice number, so showing the
            // shape it produces is more useful than describing the rule.
            placeholder="INV"
            error={errors.receiptPrefix?.message}
            {...register("receiptPrefix")}
          />

          <SelectField
            label="Paper Size"
            options={PAPER_OPTIONS}
            error={errors.paperSize?.message}
            {...register("paperSize")}
          />
        </div>

        <TextareaField
          label="Receipt Footer Message"
          rows={2}
          hint="Printed at the bottom of every receipt."
          error={errors.footerMessage?.message}
          {...register("footerMessage")}
        />

        <Checkbox label="Print the company logo on receipts" {...register("showLogo")} />
      </form>
    </SettingsPanel>
  );
}
