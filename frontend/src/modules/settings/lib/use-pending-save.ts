"use client";

import * as React from "react";

import type { AlertTone } from "@/shared/components/ui/alert";

/**
 * Shared "validated but not saved" state for the settings forms.
 *
 * There is no settings endpoint yet, so a valid submission has to say so
 * rather than imply the configuration was stored. Keeping the wording in one
 * place stops the four sections drifting into four different explanations of
 * the same situation.
 */
export function usePendingSave(sectionLabel: string) {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const reportValid = React.useCallback(() => {
    setNotice({
      tone: "info",
      message: `${sectionLabel} settings are valid, but cannot be saved until the backend settings endpoint is available.`,
    });
  }, [sectionLabel]);

  return { notice, reportValid };
}
