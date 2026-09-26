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

/**
 * Products per page of the till's catalogue.
 *
 * <p>Enough to fill a large screen with room to scroll, small enough that each
 * page — and each keystroke of a search — is a quick request. Further pages load
 * as the cashier scrolls.
 */
export const CATALOGUE_PAGE_SIZE = 60;

/**
 * The most products the grid will hold at once by scrolling.
 *
 * <p>A browsing cap, not a catalogue limit: everything stays reachable by
 * searching or choosing a category. Scrolling one grid through thirty thousand
 * product cards would bury a counter machine in page elements and photographs;
 * past this point the till asks the cashier to narrow things down instead.
 */
export const MAX_BROWSE_ITEMS = 600;
