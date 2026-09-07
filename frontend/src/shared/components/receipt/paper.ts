/**
 * What Settings → Receipts → Paper Size actually means on paper.
 *
 * <p>The setting was stored and offered in a dropdown but nothing read it: the
 * receipt was hardcoded to 72mm, so a shop that chose A4 got a thermal-roll
 * sliver in the middle of a sheet. This is the one place that turns the stored
 * value into a width and a `@page` rule, so the preview on screen and the paper
 * coming out of the printer cannot disagree.
 */

export interface Paper {
  /** CSS width for the receipt body. */
  width: string;
  /**
   * Base type size for the whole receipt.
   *
   * <p>Everything on the receipt is sized in `em` against this, so one number
   * scales the whole document. A 58mm roll needs smaller type to fit a product
   * name on one line; an A4 sheet read at arm's length needs larger, and
   * printing till-slip type on a full sheet is most of what made the A4 option
   * look like a mistake.
   */
  fontSize: string;
  /**
   * The `@page` descriptor used while this receipt is printing.
   *
   * <p>Both halves matter. `size` tells the printer what it is feeding, which
   * is what stops an 80mm roll being laid out for A4 and scaled down; `margin`
   * is set here rather than in the stylesheet because a thermal roll has almost
   * no unprintable edge while a sheet printer has a centimetre of it.
   */
  page: string;
  /** For the label under the preview, so somebody can see which is in force. */
  label: string;
}

/**
 * Paper for a stored setting.
 *
 * <p>An unrecognised value falls back to the 80mm roll rather than throwing.
 * This reads a value written by a different part of the system, possibly by an
 * older version of it, and a receipt that refuses to render is worse at the
 * counter than one that renders on the commonest paper in the shop.
 */
export function paperFor(size: string | null | undefined): Paper {
  switch (size) {
    case "58MM":
      return {
        // 58mm roll, ~50mm printable once the feed margins are taken off.
        width: "50mm",
        fontSize: "9px",
        page: "size: 58mm auto; margin: 3mm;",
        label: "58mm roll",
      };

    case "A4":
      return {
        // Not the full 210mm, but a proper document column rather than the
        // 120mm strip this used to be — a till slip magnified onto a sheet is
        // what made this option look broken. 150mm inside 15mm margins reads
        // as a bill, and the larger base type below is half of that.
        width: "150mm",
        fontSize: "11.5px",
        page: "size: A4; margin: 15mm;",
        label: "A4 sheet",
      };

    case "80MM":
    default:
      return {
        // 80mm roll, ~72mm printable. The commonest counter printer, and the
        // fallback for anything unrecognised.
        width: "72mm",
        fontSize: "10.5px",
        page: "size: 80mm auto; margin: 3mm;",
        label: "80mm roll",
      };
  }
}
