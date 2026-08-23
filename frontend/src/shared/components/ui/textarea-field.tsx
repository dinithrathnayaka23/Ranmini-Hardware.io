"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

/**
 * Multi-line text input, styled to match {@link TextField}.
 *
 * Resizing is limited to the vertical axis: a textarea that can be dragged
 * wider escapes its grid column and breaks the form layout around it.
 */
export const TextareaField = React.forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(function TextareaField(
  { label, error, hint, className, containerClassName, id, rows = 3, ...props },
  ref,
) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink-soft">
        {label}
      </label>

      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          "block w-full resize-y rounded-[10px] border bg-surface px-3.5 py-3",
          "text-[0.95rem] text-ink placeholder:text-placeholder",
          "transition-colors duration-150 focus:outline-none",
          error
            ? "border-danger/60"
            : "border-line hover:border-line-strong focus:border-brand-600",
          "focus:ring-2 focus:ring-brand-600/15",
          className,
        )}
        {...props}
      />

      {error ? (
        <p id={errorId} className="text-xs leading-relaxed text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
