import { Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a spinner and blocks interaction while an action is in flight. */
  isLoading?: boolean;
  /** Announced to screen readers while `isLoading` is true. */
  loadingText?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary:
    "bg-surface text-ink border border-line hover:border-line-strong hover:bg-brand-50/40",
  ghost: "bg-transparent text-brand-600 hover:bg-brand-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-10 px-3.5 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-5 text-[0.95rem]",
};

function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px]",
    "font-medium tracking-tight transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );
}

/**
 * Primary interactive control for the admin portal.
 *
 * While loading, the button is disabled *and* marked `aria-busy`, so assistive
 * technology reports the pending state rather than silently ignoring clicks.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "lg",
      isLoading = false,
      loadingText,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        // A loading button must not be clickable twice — that is how duplicate
        // sign-in requests (and duplicate writes) happen.
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={buttonClasses(variant, size, className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

/**
 * A link that looks like a {@link Button}.
 *
 * Used where the control navigates rather than acts — an anchor keeps
 * middle-click, "open in new tab" and the browser's own affordances working,
 * all of which a `<button>` with an onClick handler quietly breaks.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "lg",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
