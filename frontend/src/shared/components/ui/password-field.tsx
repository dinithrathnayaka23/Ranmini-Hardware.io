"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import * as React from "react";

import { TextField, type TextFieldProps } from "./text-field";

export type PasswordFieldProps = Omit<TextFieldProps, "type" | "icon">;

/**
 * Password input with a show/hide toggle.
 *
 * The toggle only changes the input's `type`; the value is never copied into
 * component state, so the plaintext password lives in exactly one place (the
 * DOM node) for as long as the browser needs it.
 */
export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(function PasswordField(props, ref) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <TextField
      ref={ref}
      type={isVisible ? "text" : "password"}
      icon={Lock}
      trailing={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          // The label changes with the state so a screen reader announces the
          // action the button will perform, not the state it is currently in.
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          // Sized as a 40px square so it is comfortably tappable on a phone; the
          // icon inside stays visually small.
          className="inline-flex size-10 items-center justify-center rounded-md text-placeholder transition-colors hover:text-ink-soft"
        >
          <ToggleIcon aria-hidden className="size-[18px]" />
        </button>
      }
      {...props}
    />
  );
});
