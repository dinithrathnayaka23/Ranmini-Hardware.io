import Image from "next/image";

import { cn } from "@/shared/lib/cn";
import { initialsOf } from "@/shared/lib/initials";

export interface AvatarProps {
  fullName: string;
  /**
   * A local path — either under `public/` or this app's own avatar route — or
   * null to fall back to initials.
   *
   * Restricted to local paths on purpose: a remote URL would need an entry in
   * `next.config.ts` image domains, and pulling a portrait from a third-party
   * host would leak who is signed in to that host on every page load.
   */
  imageUrl?: string | null;
  /** Rendered pixel size; the image is requested at twice this for retina. */
  size?: number;
  className?: string;
}

/**
 * Profile picture with an initials fallback.
 *
 * The fallback is the normal case rather than an error state — most accounts
 * never upload a photo, and initials on a tinted circle read as a deliberate
 * design rather than a missing asset.
 */
export function Avatar({
  fullName,
  imageUrl,
  size = 36,
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-brand-50 font-semibold text-brand-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={size * 2}
          height={size * 2}
          // Not run through the image optimiser, and it must not be. The
          // optimiser fetches the URL from the server, without the browser's
          // cookies — so an avatar served from this app's authenticated route
          // would come back 401 and render as a broken image. Unoptimised, the
          // browser fetches it directly and the session goes with it. The file
          // is already a small square, so there is nothing to optimise anyway.
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        // `aria-hidden` because the surrounding control already carries the
        // person's name — initials read aloud are noise, not information.
        <span aria-hidden>{initialsOf(fullName)}</span>
      )}
    </span>
  );
}
