/**
 * A product grouping, as the management screens see it.
 *
 * <p>Deliberately flat — the backend stores no hierarchy, and a hardware shop's
 * shelf labels are a short list rather than a tree. If sub-categories are ever
 * needed, that is a `parentId` on both sides, not a redesign of this screen.
 */
export interface Category {
  id: string;

  /**
   * Display name, e.g. "Cement &amp; Sand".
   *
   * <p>The API calls this field `label`, because it was shaped for the till's
   * filter chips. It is renamed here so the management screens read as what
   * they are — editing a category's name, not a chip's label.
   */
  name: string;

  /**
   * URL-safe identifier the backend derives from the name.
   *
   * <p>Stable across renames, which is what lets a bookmarked filter keep
   * working after the shop reworks its shelf labels. Shown on this screen
   * precisely because it does *not* follow a rename — somebody choosing a name
   * should be able to see what the permanent identifier will be.
   */
  slug: string;

  /** Position of the chip on the till, ascending. */
  displayOrder: number;
}
