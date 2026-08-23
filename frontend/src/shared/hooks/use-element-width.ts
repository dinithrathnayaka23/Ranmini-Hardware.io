"use client";

import * as React from "react";

/**
 * Reports the rendered width of an element, tracking resizes.
 *
 * Charts here are drawn at real pixel dimensions rather than scaled from a
 * fixed viewBox: scaling a viewBox would shrink stroke widths and axis labels
 * along with the drawing, so a chart that reads well on a laptop becomes
 * unreadable on a phone. Measuring lets every chart keep 2px lines and 12px
 * text at every size.
 *
 * Returns 0 until the first measurement, which is the caller's cue to render
 * nothing rather than a chart with a nonsense scale.
 */
export function useElementWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
