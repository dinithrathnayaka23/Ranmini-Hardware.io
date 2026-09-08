"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

/**
 * Checkbox with a custom indicator.
 *
 * The native input is kept in the DOM (visually hidden, not `display: none`)
 * so it stays focusable, keyboard-operable and readable by assistive tech —
 * the styled square is purely decorative and mirrors the peer's state.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, id, ...props }, ref) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <span className="relative inline-flex size-[18px] shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-[5px] border border-line bg-surface transition-colors checked:border-brand-600 checked:bg-brand-600"
            {...props}
          />
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute inset-0 m-auto size-3 text-on-brand opacity-0 transition-opacity peer-checked:opacity-100"
          />
        </span>
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm text-ink-soft select-none"
        >
          {label}
        </label>
      </div>
    );
  },
);
