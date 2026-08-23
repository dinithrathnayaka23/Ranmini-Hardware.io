"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Optional leading glyph rendered inside the field. */
  icon?: LucideIcon;
  /** Validation message; its presence also switches the field to error styling. */
  error?: string;
  /** Rendered at the right of the label row — e.g. a "Forgot Password?" link. */
  labelAction?: React.ReactNode;
  /** Extra control rendered inside the field's trailing edge. */
  trailing?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Labelled text input used across admin forms.
 *
 * Accessibility notes:
 *  - `useId` guarantees a unique, stable id so the `<label>` always points at
 *    its own input, even when the field is rendered more than once on a page.
 *  - The error message is linked via `aria-describedby` and `aria-invalid`, so
 *    screen readers announce *why* a field is rejected, not just that it is.
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      icon: Icon,
      error,
      labelAction,
      trailing,
      className,
      containerClassName,
      id,
      ...props
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-ink-soft"
          >
            {label}
          </label>
          {labelAction}
        </div>

        <div
          className={cn(
            "group relative flex items-center rounded-[10px] border bg-surface",
            "transition-colors duration-150",
            error
              ? "border-danger/60"
              : "border-line hover:border-line-strong focus-within:border-brand-600",
            // The ring lives on the wrapper so the icon and trailing button sit
            // inside the highlighted area rather than outside it.
            "focus-within:ring-2 focus-within:ring-brand-600/15",
          )}
        >
          {Icon ? (
            <Icon
              aria-hidden
              className="pointer-events-none ml-3.5 size-[18px] shrink-0 text-placeholder"
            />
          ) : null}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "h-12 w-full bg-transparent px-3.5 text-[0.95rem] text-ink",
              "placeholder:text-placeholder focus:outline-none",
              Icon && "pl-2.5",
              trailing && "pr-1",
              className,
            )}
            {...props}
          />

          {trailing ? <div className="pr-2">{trailing}</div> : null}
        </div>

        {error ? (
          <p id={errorId} className="text-xs leading-relaxed text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
