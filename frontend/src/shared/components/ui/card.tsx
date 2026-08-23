import * as React from "react";

import { cn } from "@/shared/lib/cn";

/**
 * Card chrome shared by every dashboard panel.
 *
 * Split into Card / CardHeader / CardBody rather than a single component with
 * a dozen props: the panels differ enough (a tinted alert header, a plain
 * header with an action, no header at all) that composition stays clearer than
 * configuration.
 */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

type HeaderTone = "default" | "danger";

const headerToneStyles: Record<HeaderTone, string> = {
  default: "border-line bg-surface",
  // A tinted header carries the urgency of the panel without needing a badge.
  danger: "border-danger/20 bg-danger-soft",
};

export function CardHeader({
  tone = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: HeaderTone }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4",
        headerToneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 flex-1 p-5", className)} {...props}>
      {children}
    </div>
  );
}
