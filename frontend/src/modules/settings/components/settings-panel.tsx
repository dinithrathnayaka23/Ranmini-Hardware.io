import { Loader2 } from "lucide-react";
import * as React from "react";

import { Card, CardBody } from "@/shared/components/ui/card";

/**
 * Chrome shared by every settings section.
 *
 * The heading is an `h2` under the page's `h1`, so the four sections form a
 * sensible outline for anyone navigating the page by headings.
 */
export function SettingsPanel({
  title,
  description,
  isSaving = false,
  children,
}: {
  title: string;
  description?: string;
  /**
   * True while the section is being saved.
   *
   * The Save button lives in the layout and targets this form by id, so it
   * cannot show a pending state of its own. Disabling the fields here is what
   * stops a second submission while the first is in flight — and it is the only
   * feedback the user gets that anything is happening.
   */
  isSaving?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {isSaving ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Saving…
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}

        <fieldset disabled={isSaving} className="mt-5 border-t border-line pt-6">
          {children}
        </fieldset>
      </CardBody>
    </Card>
  );
}
