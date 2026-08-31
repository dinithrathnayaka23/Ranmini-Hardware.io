"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/shared/components/ui/alert";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { SelectField } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";

import { SETTINGS_FORM_ID } from "../constants/settings-sections";
import { saveSecurity } from "../actions";
import { useSectionSave } from "../lib/use-section-save";
import {
  securitySchema,
  type SecurityValues,
} from "../schemas/settings.schema";
import { SettingsPanel } from "./settings-panel";

const TIMEOUT_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
] as const;

/**
 * Session handling and sign-in protection.
 *
 * NOT YET PERSISTED — see the note on the shop profile form.
 *
 * Worth stating plainly for whoever wires this up: none of these values are a
 * control until the backend enforces them. A session timeout the browser
 * respects but the API ignores is decoration — the token's own expiry is what
 * actually ends a session, and the lockout threshold has to be counted
 * server-side where an attacker cannot skip past it.
 */
export function SecurityForm({ defaults }: { defaults: SecurityValues }) {
  const { notice, save, isSaving } = useSectionSave<SecurityValues>(saveSecurity);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SecurityValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: defaults,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <SettingsPanel
      isSaving={isSaving}
      title="Security"
      description="Session handling and sign-in protection."
    >
      <form
        id={SETTINGS_FORM_ID}
        onSubmit={handleSubmit(save)}
        noValidate
        className="space-y-6"
      >
        {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Session Timeout"
            options={TIMEOUT_OPTIONS}
            error={errors.sessionTimeoutMinutes?.message}
            {...register("sessionTimeoutMinutes")}
          />

          <TextField
            label="Minimum Password Length"
            type="number"
            inputMode="numeric"
            step="1"
            min={8}
            max={64}
            // The floor of 8 is enforced by the schema too: the sign-in and
            // staff forms already require it, and letting this setting undercut
            // them would silently weaken every password in the system.
            error={errors.minPasswordLength?.message}
            {...register("minPasswordLength", { valueAsNumber: true })}
          />

          <TextField
            label="Lock Account After (failed attempts)"
            type="number"
            inputMode="numeric"
            step="1"
            min={3}
            max={20}
            error={errors.lockoutThreshold?.message}
            {...register("lockoutThreshold", { valueAsNumber: true })}
          />
        </div>

        <Checkbox
          label="Keep an audit log of administrator actions"
          {...register("auditLogEnabled")}
        />
      </form>
    </SettingsPanel>
  );
}
