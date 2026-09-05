/**
 * The two constants the till needs that are not shop data.
 *
 * <p>This file used to hold a placeholder catalogue as well — ten products and
 * six categories, written so every card state was reachable while the backend
 * was still being built. Both endpoints have existed for some time and the till
 * reads them, so the placeholder rows were dead: exported, imported nowhere,
 * and describing a shop that does not stock any of it.
 */

/**
 * The "All Items" chip is part of the filter UI rather than a real category, so
 * it is declared here as a sentinel instead of being special-cased in markup.
 */
export const ALL_CATEGORIES = "all";

/** Which till this browser is. Comes from device configuration, eventually. */
export const TERMINAL_NAME = "POS Terminal 1";
