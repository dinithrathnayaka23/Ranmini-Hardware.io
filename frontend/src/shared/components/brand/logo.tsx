import Image from "next/image";

import { appConfig } from "@/shared/config/app.config";
import { cn } from "@/shared/lib/cn";

/** Path to the derived mark. See `public/images/brand/README.md`. */
const MARK_SRC = "/images/brand/ranmini-mark.png";

export interface LogoProps {
  /** Hides the wordmark, leaving only the mark (useful in tight headers). */
  markOnly?: boolean;
  /**
   * Wordmark colour. The mark itself is unchanged either way — it is a white
   * badge that reads correctly on both the light chrome and the navy rail.
   */
  tone?: "light" | "dark";
  /** Rendered size of the mark in pixels. */
  size?: number;
  /**
   * Load eagerly. Worth setting where the logo is the first thing on screen —
   * the sign-in pages — so it does not pop in after the form has painted.
   */
  priority?: boolean;
  className?: string;
}

/**
 * The Ranmini Hardware lockup: the shop's circular mark beside its name.
 *
 * <p>The mark is the client's own artwork, cropped out of the supplied
 * presentation image and masked to the circle — see
 * `public/images/brand/README.md` for how it is derived and how to regenerate
 * it if the master is ever replaced.
 *
 * <p><b>The wordmark text is not redundant.</b> The mark contains the shop's
 * name inside the circle, but at the 36px this renders at in a sidebar or a top
 * bar that lettering is far below legible — it reads as texture. The text
 * beside it is what actually carries the name at small sizes, and it is what a
 * screen reader announces, which is why the image itself is marked decorative
 * whenever the text is present.
 */
export function Logo({
  markOnly = false,
  tone = "light",
  size = 36,
  priority = false,
  className,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={MARK_SRC}
        // Decorative when the name is spelled out beside it; when the mark
        // stands alone it has to carry the name itself.
        alt={markOnly ? appConfig.name : ""}
        aria-hidden={markOnly ? undefined : true}
        width={size * 2}
        height={size * 2}
        priority={priority}
        // A fixed pixel box rather than a Tailwind size class, so a caller can
        // ask for any size without a matching utility having to exist.
        style={{ width: size, height: size }}
        className="shrink-0 object-contain"
      />

      {!markOnly && (
        <span
          className={cn(
            "text-[0.95rem] font-semibold tracking-tight",
            tone === "dark" ? "text-white" : "text-ink",
          )}
        >
          {appConfig.name}
        </span>
      )}
    </span>
  );
}
