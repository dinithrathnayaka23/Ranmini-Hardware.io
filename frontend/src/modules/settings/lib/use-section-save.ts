"use client";

import * as React from "react";

import type { AlertTone } from "@/shared/components/ui/alert";

import type { SettingsActionResult } from "../actions";

/**
 * Shared save behaviour for the four settings sections.
 *
 * Each form differs only in which Server Action it calls, so the submitting,
 * the pending state and the wording of the outcome live here rather than being
 * written four times and drifting into four different explanations of the same
 * thing.
 */
export function useSectionSave<TValues>(
  action: (values: TValues) => Promise<SettingsActionResult>,
) {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const [isSaving, setIsSaving] = React.useState(false);

  const save = React.useCallback(
    async (values: TValues) => {
      setIsSaving(true);
      setNotice(null);

      const result = await action(values);

      setIsSaving(false);
      setNotice({
        tone: result.success ? "success" : "danger",
        message: result.message,
      });
    },
    [action],
  );

  return { notice, save, isSaving };
}
