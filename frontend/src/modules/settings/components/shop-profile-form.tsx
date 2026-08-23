"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { TextField } from "@/shared/components/ui/text-field";
import { TextareaField } from "@/shared/components/ui/textarea-field";

import { SETTINGS_FORM_ID } from "../constants/settings-sections";
import { usePendingSave } from "../lib/use-pending-save";
import {
  shopProfileSchema,
  type ShopProfileValues,
} from "../schemas/settings.schema";
import { LogoUpload } from "./logo-upload";
import { SettingsPanel } from "./settings-panel";

/**
 * Business identity, address and contact details.
 *
 * NOT YET PERSISTED — validation is real, but there is no settings endpoint to
 * submit to, so a valid submission says so plainly. The form carries the shared
 * id that lets the page header's "Save Changes" button submit it from outside.
 */
export function ShopProfileForm({ defaults }: { defaults: ShopProfileValues }) {
  const { notice, reportValid } = usePendingSave("Shop profile");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShopProfileValues>({
    resolver: zodResolver(shopProfileSchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <SettingsPanel title="Shop Profile">
      <form
        id={SETTINGS_FORM_ID}
        onSubmit={handleSubmit(reportValid)}
        noValidate
        className="space-y-6"
      >
        {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

        <LogoUpload />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Company Name"
            autoComplete="organization"
            error={errors.companyName?.message}
            {...register("companyName")}
          />

          <TextField
            label="Registration Number"
            autoComplete="off"
            error={errors.registrationNumber?.message}
            {...register("registrationNumber")}
          />
        </div>

        <TextareaField
          label="Primary Address"
          rows={2}
          autoComplete="street-address"
          error={errors.primaryAddress?.message}
          {...register("primaryAddress")}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Contact Email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.contactEmail?.message}
            {...register("contactEmail")}
          />

          <TextField
            label="Contact Phone"
            type="tel"
            autoComplete="tel"
            error={errors.contactPhone?.message}
            {...register("contactPhone")}
          />
        </div>
      </form>
    </SettingsPanel>
  );
}
