import { appConfig } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";

export interface LogoProps {
  /** Hides the wordmark, leaving only the mark (useful in tight headers). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Ranmini Hardware lockup: a blue rounded-square mark plus the wordmark.
 *
 * The mark is inline SVG rather than an image file so it stays crisp at every
 * density and costs no extra network request on the login screen.
 */
export function Logo({ markOnly = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden
        className="inline-flex size-9 items-center justify-center rounded-[10px] bg-brand-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-5 text-white"
          role="presentation"
        >
          {/* Grip */}
          <path
            d="M9.2 3h5.6a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-1.2 1.2H9.2A1.2 1.2 0 0 1 8 8.8V4.2A1.2 1.2 0 0 1 9.2 3Z"
            fill="currentColor"
          />
          {/* Shaft tapering to the tip */}
          <path
            d="M10.9 11.2h2.2v6.6l-1.1 3.2-1.1-3.2v-6.6Z"
            fill="currentColor"
          />
        </svg>
      </span>

      {!markOnly && (
        <span className="text-[0.95rem] font-semibold tracking-tight text-ink">
          {appConfig.name}
        </span>
      )}
    </span>
  );
}
