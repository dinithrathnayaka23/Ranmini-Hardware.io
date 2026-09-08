"use client";

import Image from "next/image";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

import {
  SLIDE_INTERVAL_MS,
  showcaseSlides,
} from "../constants/showcase-slides";

/**
 * The right-hand marketing panel of the sign-in screen.
 *
 * It auto-advances through {@link showcaseSlides} with a cross-fade, and is
 * decorative: it is hidden on small screens and carries `aria-roledescription`
 * so assistive tech treats it as a carousel rather than as page content the
 * user must read through before reaching the form.
 */
export function BrandShowcase({ className }: { className?: string }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Auto-advance, unless the user has asked their OS to reduce motion — an
  // unprompted moving background is exactly what that setting exists to stop.
  React.useEffect(() => {
    if (prefersReducedMotion || showcaseSlides.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % showcaseSlides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  const activeSlide = showcaseSlides[activeIndex];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Product highlights"
      className={cn("relative isolate overflow-hidden bg-brand-900", className)}
    >
      {/* Brand gradient: the base layer, and the graceful fallback whenever a
          photograph is absent or fails to load. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-br from-brand-700 via-brand-800 to-brand-900"
      />

      {showcaseSlides.map((slide, index) => (
        <SlideImage
          key={slide.id}
          src={slide.image}
          alt={slide.imageAlt}
          isActive={index === activeIndex}
          isPriority={index === 0}
        />
      ))}

      {/* Scrim: guarantees the caption keeps a readable contrast ratio no
          matter how bright the underlying photograph is. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-black/5"
      />

      <div className="relative flex h-full flex-col justify-end px-12 pt-12 pb-10 xl:px-16 2xl:px-20">
        <div
          // Announce caption changes politely; never interrupt someone typing
          // their password in the form beside it.
          aria-live="polite"
          className="max-w-lg"
        >
          <h2 className="text-4xl leading-[1.15] font-semibold tracking-tight text-white xl:text-5xl">
            {activeSlide.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/80 xl:text-lg">
            {activeSlide.description}
          </p>
        </div>

        {/*
          Left-aligned, under the caption rather than centred beneath it. The
          headline, the description and the indicators are one block of content
          against the left edge of the panel; a centred row of dots read as
          belonging to the photograph instead of to the words above it.
        */}
        <div className="mt-12 flex items-center gap-2">
          {showcaseSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show highlight ${index + 1} of ${showcaseSlides.length}`}
              aria-current={index === activeIndex}
              // Each control keeps a 40px touch area regardless of how small the
              // mark inside it is — `p-2` around a 2.5-unit bar gets there
              // without the bar itself having to grow.
              className="group -m-2 p-2"
            >
              <span
                aria-hidden
                className={cn(
                  // The current slide is a wider bar rather than a brighter dot.
                  // Length survives a bright photograph behind it, where the
                  // difference between white and 40% white does not — and it
                  // also gives the indicator a second channel besides tone.
                  "block h-1.5 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "w-7 bg-white"
                    : "w-1.5 bg-white/50 group-hover:bg-white/80",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * One cross-fading background photograph.
 *
 * All slides stay mounted and are toggled with opacity so switching does not
 * re-trigger a network fetch. A failed load simply stays transparent, letting
 * the brand gradient underneath show through.
 */
function SlideImage({
  src,
  alt,
  isActive,
  isPriority,
}: {
  src: string;
  alt: string;
  isActive: boolean;
  isPriority: boolean;
}) {
  const [hasFailed, setHasFailed] = React.useState(false);

  if (hasFailed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      // The panel is at most 60% of the viewport and never shown below `lg`.
      sizes="(max-width: 1024px) 0px, 60vw"
      priority={isPriority}
      onError={() => setHasFailed(true)}
      className={cn(
        "absolute inset-0 object-cover transition-opacity duration-1000",
        isActive ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

/** Tracks the user's OS-level "reduce motion" preference. */
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setPrefersReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return prefersReduced;
}
