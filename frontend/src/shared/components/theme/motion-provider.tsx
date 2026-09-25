"use client";

import { MotionConfig } from "motion/react";

/**
 * App-wide settings for every Motion animation.
 *
 * <p>`reducedMotion="user"` is the reason this exists. The global CSS rule in
 * `globals.css` already shortens CSS transitions for people who ask the OS to
 * reduce motion, but Motion animates through JavaScript and never sees that
 * rule. Without this, the sliding indicators and dialog entrances would keep
 * moving for exactly the people who asked them not to.
 *
 * <p>The default transition is short and does not overshoot. A till is used
 * hundreds of times a day, and a springy UI that feels playful on the first
 * sale becomes a delay by the fiftieth.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "tween", ease: [0.25, 0.1, 0.25, 1], duration: 0.2 }}
    >
      {children}
    </MotionConfig>
  );
}
