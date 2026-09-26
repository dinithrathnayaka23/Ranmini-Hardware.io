"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";

/*
 * Adapted from the UI Layouts "Accordion" component (MIT) — see
 * THIRD_PARTY_NOTICES.md.
 *
 * What was kept is the two-layer reveal their panel is built on: an outer
 * element animating `height: 0 → auto` behind `overflow: hidden`, and an inner
 * one wiping its own `clip-path` open over the same interval. Height alone is
 * not enough — it slides a fully drawn panel up behind the mask, so the *last*
 * line of a receipt appears first and the rest scrolls down after it. The clip
 * wipe reveals the content from its top edge instead, which is where the row it
 * belongs to actually is, so the panel reads as growing out of that row.
 *
 * What was dropped is their compound API — Accordion / AccordionItem /
 * AccordionHeader / AccordionPanel, with a React context passing the open value
 * between them. Every place this is used already owns its trigger, and those
 * triggers are a table cell's icon button, a card's full-width footer button and
 * a toolbar's Filter button; none would survive being replaced by a generic
 * header. The open state is not theirs to keep either: the catalogue allows
 * exactly one open panel across the whole screen, which their context has no way
 * to express. Their spring became a tween, like every other movement here.
 */

/** Matches `panelMotion` in `dialog-motion.ts`, so overlays and panels agree. */
const DURATION = 0.22;
const EASE = [0.25, 0.1, 0.25, 1] as const;

/** Fully closed, and fully open. Two keyframes, shared by both layers. */
const CLOSED_CLIP = "polygon(0 0, 100% 0, 100% 0, 0 0)";
const OPEN_CLIP = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

/**
 * The animated pair of elements, without any opinion about what wraps them.
 *
 * <p>Shared by {@link Disclosure} and {@link DisclosureRow}, which differ only in
 * the element that has to survive long enough to animate out.
 */
function Collapse({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const shell = React.useRef<HTMLDivElement>(null);

  /**
   * Hands the height back to the browser once the panel is open.
   *
   * <p>Animating to `height: "auto"` has to resolve to a pixel figure to be
   * interpolated, and the panel's contents do not stay that tall: a stock
   * correction grows an extra line when a delivery cost is typed, and the
   * catalogue reuses one open panel for two different forms, so switching from
   * "withdraw" to "adjust stock" replaces short content with tall. A height left
   * at the figure measured on opening would clip whatever arrived afterwards —
   * silently, since `overflow` is hidden. Clearing it makes the panel
   * self-sizing for the whole time it is open, which is exactly when the content
   * changes.
   *
   * <p>The target is checked rather than assumed. This same callback fires when
   * the *closing* animation finishes, and handing the height back one frame
   * before the element unmounts would flash the panel open again on its way out.
   */
  const releaseHeight = React.useCallback((target: unknown) => {
    const isOpening =
      typeof target === "object" &&
      target !== null &&
      (target as { height?: unknown }).height === "auto";

    if (isOpening && shell.current) shell.current.style.height = "auto";
  }, []);

  return (
    <motion.div
      ref={shell}
      // A `region` with no accessible name is not a landmark and buys nothing,
      // so the role appears only where a caller names the panel. The trigger's
      // own `aria-expanded` and `aria-controls` are what carry the relationship
      // in either case.
      role={labelledBy ? "region" : undefined}
      id={id}
      aria-labelledby={labelledBy}
      initial={{ height: 0 }}
      animate={{ height: "auto" }}
      exit={{ height: 0 }}
      transition={{ duration: DURATION, ease: EASE }}
      onAnimationComplete={releaseHeight}
      // `overflow-hidden` is what the height animation clips against; the inner
      // wipe is what stops the content sliding up behind it.
      className="overflow-hidden"
    >
      <motion.div
        initial={{ clipPath: CLOSED_CLIP }}
        animate={{ clipPath: OPEN_CLIP }}
        exit={{ clipPath: CLOSED_CLIP }}
        transition={{ duration: DURATION, ease: EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * A region that grows and shrinks in place when it is opened and closed.
 *
 * <p><b>Why this exists at all.</b> Half the admin portal expands something
 * where you clicked rather than opening a dialog — a receipt under a sale, a
 * stock correction under a product, a status filter under a toolbar. Every one of
 * those used to appear and vanish in a single frame, which is the case where
 * movement is doing real work rather than decorating: a panel that materialises
 * mid-table shoves everything below it down by 200px with nothing to say where it
 * came from, and in a list of near-identical rows that costs the reader their
 * place — or their click, if the pointer was already on its way to a row that is
 * no longer there. Growing it out of its own row answers "which row is this?"
 * without a word.
 *
 * <p><b>It is not a `<details>` element.</b> The triggers are scattered — one
 * lives in a different table cell from its panel, another is one of three in a
 * card's footer — so the markup cannot nest the way `<details>` requires. `id`
 * and `labelledBy` wire the pair together for assistive technology instead, and
 * the trigger keeps its own `aria-expanded` and `aria-controls`.
 *
 * <p><b>Nothing is mounted while it is closed.</b> These panels hold live forms
 * with their own drafts, and a stock correction half typed into a collapsed row
 * would be submitted invisibly. Unmounting also keeps a twenty-row table from
 * carrying twenty hidden forms.
 */
export function Disclosure({
  open,
  id,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  /** Matches the trigger's `aria-controls`. */
  id?: string;
  /** The id of the control that opened this, for `aria-labelledby`. */
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
}) {
  // Motion's own reduce-motion handling covers transforms and layout
  // animations, not height — so somebody who asked for stillness would still get
  // the panel unrolling. Checked here and skipped outright instead.
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return open ? (
      <div
        role={labelledBy ? "region" : undefined}
        id={id}
        aria-labelledby={labelledBy}
        className={className}
      >
        {children}
      </div>
    ) : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <Collapse id={id} labelledBy={labelledBy} className={className}>
          {children}
        </Collapse>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * The same panel, as an extra row spanning a table.
 *
 * <p>A separate component rather than a prop, because a table row cannot be
 * wrapped: `<tbody>` accepts only `<tr>`, so the element that survives long
 * enough to animate out has to *be* the row. `motion.tr` animates nothing itself
 * — it carries no animation props — but it registers with `AnimatePresence`,
 * which then waits for the panel nested inside it to finish collapsing before the
 * row leaves the DOM. Without it the row unmounts on the click and there is
 * nothing left to animate.
 *
 * <p>The height is animated on a `div` inside the cell rather than on the row or
 * the cell. Browsers treat `height` on table elements as a minimum and recompute
 * it from the row's content, so animating either one jumps to whatever height the
 * content happens to want.
 */
export function DisclosureRow({
  open,
  colSpan,
  id,
  labelledBy,
  className,
  rowClassName,
  children,
}: {
  open: boolean;
  /** Every column, so the panel spans the full width of the table. */
  colSpan: number;
  id?: string;
  labelledBy?: string;
  className?: string;
  /** Applied to the `<tr>` — a hairline under the panel, typically. */
  rowClassName?: string;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return open ? (
      <tr className={rowClassName}>
        <td colSpan={colSpan} className="p-0">
          <div
            role={labelledBy ? "region" : undefined}
            id={id}
            aria-labelledby={labelledBy}
            className={className}
          >
            {children}
          </div>
        </td>
      </tr>
    ) : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.tr className={rowClassName}>
          {/* `p-0`: the panel brings its own padding, and a cell's padding would
              stay behind at full height while the panel collapsed. */}
          <td colSpan={colSpan} className="p-0">
            <Collapse id={id} labelledBy={labelledBy} className={className}>
              {children}
            </Collapse>
          </td>
        </motion.tr>
      ) : null}
    </AnimatePresence>
  );
}
