import { AlertCircle } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export interface AlertProps {
  message: string;
  className?: string;
}

/**
 * Inline error banner for form-level failures (bad credentials, network down).
 *
 * `role="alert"` makes screen readers announce the message the moment it
 * appears, which matters because the failure is otherwise a purely visual
 * change well above the submit button the user just pressed.
 */
export function Alert({ message, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border border-danger/25",
        "bg-danger-soft px-3.5 py-3 text-sm text-danger",
        className,
      )}
    >
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
