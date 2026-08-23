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
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}

        <div className="mt-5 border-t border-line pt-6">{children}</div>
      </CardBody>
    </Card>
  );
}
