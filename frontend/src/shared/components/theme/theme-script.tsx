import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
} from "@/shared/lib/theme";

/**
 * Applies the stored colour scheme before the browser paints anything.
 *
 * <p><b>Why this cannot be a `useEffect`.</b> React effects run after the first
 * paint, so a user who chose dark would get a full white page for a frame or
 * two and then a flip — the "flash of wrong theme" that makes an otherwise
 * finished feature feel broken. A blocking inline script in the document runs
 * before any pixels are drawn, so the attribute is already on `<html>` when the
 * stylesheet is first applied.
 *
 * <p>It is a script tag rather than a server-rendered attribute because the
 * preference lives in `localStorage`, which only the browser can read. Moving
 * it to a cookie would let the server render it, at the cost of sending the
 * value on every single request for something that changes no server output.
 *
 * <p>The whole body sits inside `try`. `localStorage` throws outright — not
 * returns null — in a browser configured to block site data, and an exception
 * here would abort the script and leave the page unstyled by any theme.
 *
 * <p>Content-Security-Policy note: `script-src` in `next.config.ts` includes
 * `'unsafe-inline'`, which Next.js already requires for its own bootstrap, so
 * this needs no nonce. If that policy is ever tightened to nonces, this tag
 * needs one too.
 *
 * <h4>The till is pinned to the light palette</h4>
 *
 * <p>Everything under `/cashier` renders light whatever the stored preference
 * says. The till was designed and tested in one palette, and several of its
 * controls put a hardcoded white label on a brand-coloured fill — which is
 * exactly the pairing that inverts badly when the accents lighten. Rather than
 * ship a dark till nobody has stood in front of, the counter screens opt out.
 *
 * <p>The check is on the path at load, so it does not survive a client-side
 * navigation from the portal into the till. Nothing can make that navigation:
 * the two portals reject each other's accounts, so reaching the till from the
 * portal means a sign-out and a fresh document. If the two are ever joined,
 * this needs to become a layout-level concern instead.
 */
export function ThemeScript() {
  // Built from the shared constants rather than written out by hand, so
  // renaming the storage key cannot leave this script reading the old one.
  const script = `
try {
  var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  var theme = stored === "dark" || stored === "light" ? stored : ${JSON.stringify(DEFAULT_THEME)};
  if (location.pathname.indexOf("/cashier") === 0) theme = "light";
  document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, theme);
} catch (error) {
  document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, ${JSON.stringify(DEFAULT_THEME)});
}
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
