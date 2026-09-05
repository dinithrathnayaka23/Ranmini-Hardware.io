"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { TextField } from "@/shared/components/ui/text-field";
import { TextareaField } from "@/shared/components/ui/textarea-field";

import { SETTINGS_FORM_ID } from "../constants/settings-sections";
import { saveShopProfile } from "../actions";
import { useSectionSave } from "../lib/use-section-save";
import {
  shopProfileSchema,
  type ShopProfileValues,
} from "../schemas/settings.schema";
import { LogoUpload } from "./logo-upload";
import { SettingsPanel } from "./settings-panel";

/**
 * Business identity, address and contact details.
 *
 * <p>The form carries the shared id that lets the page header's "Save Changes"
 * button submit it from outside.
 *
 * <p>The logo above the fields is not part of that submission. It uploads on
 * its own, immediately, because an image is a different kind of change from a
 * text field and one that appeared on screen but needed a separate save to
 * persist would be the more confusing of the two.
 */
export function ShopProfileForm({
  defaults,
  logoUpdatedAt,
}: {
  defaults: ShopProfileValues;
  logoUpdatedAt: string | null;
}) {
  const { notice, save, isSaving } = useSectionSave<ShopProfileValues>(saveShopProfile);

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
    <SettingsPanel isSaving={isSaving} title="Shop Profile">
      <form
        id={SETTINGS_FORM_ID}
        onSubmit={handleSubmit(save)}
        noValidate
        className="space-y-6"
      >
        {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

        <LogoUpload logoUpdatedAt={logoUpdatedAt} />

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
