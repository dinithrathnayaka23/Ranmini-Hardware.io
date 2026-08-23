import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export type AlertTone = "danger" | "success" | "info";

export interface AlertProps {
  message: string;
  /** Defaults to `danger`, which is the common case on forms. */
  tone?: AlertTone;
  className?: string;
}

const toneStyles: Record<AlertTone, { box: string; icon: LucideIcon }> = {
  danger: {
    box: "border-danger/25 bg-danger-soft text-danger",
    icon: CircleAlert,
  },
  success: {
    box: "border-success/25 bg-success-soft text-success",
    icon: CircleCheck,
  },
  info: {
    box: "border-brand-600/20 bg-brand-50 text-brand-800",
    icon: Info,
  },
};

/**
 * Inline banner for form-level messages.
 *
 * `role="alert"` makes screen readers announce the message the moment it
 * appears, which matters because the change is otherwise purely visual and
 * often above the control the user just activated.
 */
export function Alert({ message, tone = "danger", className }: AlertProps) {
  const { box, icon: Icon } = toneStyles[tone];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-sm",
        box,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
