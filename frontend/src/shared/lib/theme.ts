/**
 * The colour-scheme preference, and the one place its details are written down.
 *
 * <p>Shared by the pre-paint script and the toggle so the two cannot drift: the
 * script reads the stored value before the first frame, the toggle writes it,
 * and a typo in either would show up as a flash of the wrong theme on every
 * page load — the sort of bug that is obvious to a user and invisible in a
 * diff.
 */

/** The two schemes. There is no "system" — see {@link THEME_STORAGE_KEY}. */
export type Theme = "light" | "dark";

/**
 * Where the choice is remembered.
 *
 * <p>`localStorage`, not a cookie, because nothing on the server renders
 * differently for it: the theme is entirely a matter of which CSS variables
 * apply, so sending it up with every request would buy nothing and cost a
 * cookie. The trade is that the preference is per browser rather than per
 * account, which is the right shape anyway — the same administrator may want
 * dark on the office laptop and light on the shop's counter machine.
 *
 * <p>Namespaced, because a browser at the shop may hold keys for other tools.
 */
export const THEME_STORAGE_KEY = "ranmini.theme";

/** The attribute the stylesheet keys off, set on `<html>`. */
export const THEME_ATTRIBUTE = "data-theme";

/**
 * What a browser with no stored preference gets.
 *
 * <p>Light, rather than following the operating system. The same stylesheet
 * serves the cashier's till, which is a shared machine at a counter, and the
 * shop's Windows theme should not decide what it looks like partway through a
 * shift. An administrator who wants dark asks for it once, and it sticks.
 */
export const DEFAULT_THEME: Theme = "light";

/** Narrows an unknown stored value; anything unrecognised falls back. */
export function toTheme(value: string | null | undefined): Theme {
  return value === "dark" || value === "light" ? value : DEFAULT_THEME;
}
