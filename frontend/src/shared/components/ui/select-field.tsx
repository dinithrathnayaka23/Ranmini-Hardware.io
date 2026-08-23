"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  error?: string;
  containerClassName?: string;
}

/**
 * Labelled dropdown, styled to match {@link TextField}.
 *
 * Deliberately wraps a native `<select>` rather than reimplementing a listbox:
 * the platform control already gives us keyboard navigation, type-ahead and
 * the correct mobile picker, none of which a custom widget gets for free.
 * Only the chevron is ours, so `appearance-none` hides the native one.
 */
export const SelectField = React.forwardRef<
  HTMLSelectElement,
  SelectFieldProps
>(function SelectField(
  { label, options, error, className, containerClassName, id, ...props },
  ref,
) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <label htmlFor={selectId} className="text-sm font-medium text-ink-soft">
        {label}
      </label>

      <div
        className={cn(
          "relative flex items-center rounded-[10px] border bg-surface transition-colors duration-150",
          error
            ? "border-danger/60"
            : "border-line hover:border-line-strong focus-within:border-brand-600",
          "focus-within:ring-2 focus-within:ring-brand-600/15",
        )}
      >
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 w-full appearance-none bg-transparent px-3.5 pr-10",
            "text-[0.95rem] text-ink focus:outline-none",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3.5 size-[18px] text-placeholder"
        />
      </div>

      {error ? (
        <p id={errorId} className="text-xs leading-relaxed text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
