import { accentChip, accentText, type Accent } from "@/shared/lib/accent";
import { cn } from "@/shared/lib/cn";

/**
 * Small status pill.
 *
 * The dot is decorative; the label carries the meaning. That ordering matters —
 * status must never be communicated by colour alone, or it disappears for a
 * colour-blind user and in a black-and-white printout of a stock report.
 */
export function Badge({
  label,
  accent,
  className,
}: {
  label: string;
  accent: Accent;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        accentChip[accent],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full bg-current", accentText[accent])}
      />
      {label}
    </span>
  );
}
