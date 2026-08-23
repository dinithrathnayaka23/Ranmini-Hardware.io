import * as React from "react";

/**
 * Title block at the top of every portal screen.
 *
 * Keeps the heading, the one-line explanation and the primary actions in one
 * consistent arrangement, so screens do not each invent their own spacing.
 * Actions wrap under the title on narrow screens rather than squeezing it.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
