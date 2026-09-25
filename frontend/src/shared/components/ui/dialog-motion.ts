import type { MotionProps } from "motion/react";

/*
 * Entrance and exit motion for overlays, adapted from the UI Layouts "Dialog"
 * and "Responsive Modal" components (MIT) — see THIRD_PARTY_NOTICES.md.
 *
 * Their panels scale up from 90% on a spring. That reads as playful, and a
 * dialog that bounces every time a cashier opens it gets old quickly, so these
 * keep the shape of the movement (the backdrop fades, the panel rises into
 * place) with a shorter travel and no overshoot.
 *
 * Kept as plain presets rather than a <Dialog> component: each overlay in the
 * app already owns its focus, Escape handling and layout, and those are the
 * parts that are easy to get subtly wrong when forced through a generic wrapper.
 */

type Preset = Pick<MotionProps, "initial" | "animate" | "exit" | "transition">;

/** The dimmed backdrop behind any overlay. */
export const backdropMotion: Preset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
};

/** A centred or full-screen panel: rises a few pixels as it fades in. */
export const panelMotion: Preset = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
};

/** A drawer that enters from the left edge, like the mobile navigation. */
export const drawerLeftMotion: Preset = {
  initial: { x: "-100%" },
  animate: { x: 0 },
  exit: { x: "-100%" },
  transition: { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] },
};

/** A small menu or popover that drops from its trigger. */
export const popoverMotion: Preset = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.14 },
};
