package lk.ranminihardware.pos.shared.pdf;

import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import java.awt.Color;

/**
 * One look for every PDF this service produces.
 *
 * <p>The shop prints these and files them, so they are typeset rather than
 * dumped: a rule under each heading, a shaded header row, figures right-aligned
 * on their decimal point, and alternating row tints so the eye can follow a line
 * of ten columns across a page. All of it lives here so the inventory export and
 * the sales report cannot drift into looking like two different companies'
 * paperwork.
 *
 * <p><b>Colours are muted on purpose.</b> These documents are printed on the
 * shop's laser printer as often as they are read on screen, and saturated fills
 * cost toner while turning grey and illegible. The palette is near-black text on
 * white with grey rules, and colour used only where it carries meaning — a
 * red-brown figure for stock that has run out.
 *
 * <p><b>On text encoding:</b> the built-in Helvetica faces used here cover
 * Latin-1, which is every character a Sinhala shop actually types into a product
 * name today ("Rs." included). A product named in Sinhala script would need a
 * Unicode font embedded in the document; that is a font-licensing decision for
 * the shop rather than something to guess at here, and it is the one change this
 * class would need to support it.
 */
public final class PdfTheme {

  /** Body text. Near-black rather than black: pure black prints harshly. */
  public static final Color INK = new Color(0x1F, 0x25, 0x2B);

  /** Secondary text — captions, footers, units. */
  public static final Color MUTED = new Color(0x6B, 0x72, 0x80);

  /** Rules and table borders. */
  public static final Color LINE = new Color(0xD5, 0xDA, 0xE0);

  /** Table header fill and the tint on alternating rows. */
  public static final Color HEADER_FILL = new Color(0xEC, 0xF0, 0xF4);

  public static final Color ROW_FILL = new Color(0xF8, 0xFA, 0xFB);

  /** The brand blue, used sparingly — headings and the accent rule only. */
  public static final Color BRAND = new Color(0x1D, 0x4E, 0xD8);

  /** Something that needs acting on: an empty shelf, a negative margin. */
  public static final Color ALERT = new Color(0xB4, 0x23, 0x18);

  public static final Font TITLE = font(18F, Font.BOLD, INK);
  public static final Font SUBTITLE = font(10F, Font.NORMAL, MUTED);
  public static final Font SECTION = font(12F, Font.BOLD, INK);
  public static final Font BODY = font(9F, Font.NORMAL, INK);
  public static final Font BODY_BOLD = font(9F, Font.BOLD, INK);
  public static final Font SMALL = font(7.5F, Font.NORMAL, MUTED);
  public static final Font TABLE_HEAD = font(8F, Font.BOLD, INK);
  public static final Font CELL = font(8F, Font.NORMAL, INK);
  public static final Font CELL_BOLD = font(8F, Font.BOLD, INK);
  public static final Font CELL_ALERT = font(8F, Font.BOLD, ALERT);

  private PdfTheme() {}

  public static Font font(float size, int style, Color colour) {
    return FontFactory.getFont(FontFactory.HELVETICA, size, style, colour);
  }

  /**
   * A table header cell.
   *
   * <p>Bordered on the bottom only. A full grid of lines competes with the
   * figures for attention; one rule under the headings is enough to say where
   * the data starts.
   */
  public static PdfPCell head(String text, int alignment) {
    PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_HEAD));
    cell.setHorizontalAlignment(alignment);
    cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    cell.setBackgroundColor(HEADER_FILL);
    cell.setBorderColor(LINE);
    cell.setBorderWidthTop(0);
    cell.setBorderWidthLeft(0);
    cell.setBorderWidthRight(0);
    cell.setBorderWidthBottom(0.7F);
    cell.setPaddingTop(5F);
    cell.setPaddingBottom(5F);
    cell.setPaddingLeft(5F);
    cell.setPaddingRight(5F);
    return cell;
  }

  /** A body cell. Pass {@code tinted} on alternating rows. */
  public static PdfPCell cell(String text, int alignment, boolean tinted) {
    return cell(new Phrase(text == null ? "" : text, CELL), alignment, tinted);
  }

  public static PdfPCell cell(Phrase phrase, int alignment, boolean tinted) {
    PdfPCell cell = new PdfPCell(phrase);
    cell.setHorizontalAlignment(alignment);
    cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    cell.setBorderColor(LINE);
    cell.setBorderWidthTop(0);
    cell.setBorderWidthLeft(0);
    cell.setBorderWidthRight(0);
    cell.setBorderWidthBottom(0.4F);
    cell.setPaddingTop(4F);
    cell.setPaddingBottom(4F);
    cell.setPaddingLeft(5F);
    cell.setPaddingRight(5F);
    if (tinted) cell.setBackgroundColor(ROW_FILL);
    return cell;
  }

  /**
   * A row that groups or totals the rows around it.
   *
   * <p>Shaded and ruled above rather than merely bold: on a printed page a bold
   * subtotal in a column of bold-ish figures disappears, and somebody adding up
   * a stocktake by hand needs to see instantly where one section ends.
   */
  public static PdfPCell groupCell(String text, int alignment) {
    PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, CELL_BOLD));
    cell.setHorizontalAlignment(alignment);
    cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    cell.setBackgroundColor(HEADER_FILL);
    cell.setBorderColor(LINE);
    cell.setBorderWidthTop(0.4F);
    cell.setBorderWidthLeft(0);
    cell.setBorderWidthRight(0);
    cell.setBorderWidthBottom(0.4F);
    cell.setPaddingTop(4F);
    cell.setPaddingBottom(4F);
    cell.setPaddingLeft(5F);
    cell.setPaddingRight(5F);
    return cell;
  }

  /**
   * A table sized to the printable width with its header row repeated.
   *
   * <p>Header repetition is the reason this helper exists rather than each
   * report configuring its own table: an inventory of four hundred lines runs to
   * a dozen pages, and a page of unlabelled numbers is unreadable.
   */
  public static PdfPTable table(float... columnWidths) {
    PdfPTable table = new PdfPTable(columnWidths);
    table.setWidthPercentage(100F);
    table.setHeaderRows(1);
    table.setSpacingBefore(8F);
    table.setSpacingAfter(4F);
    return table;
  }
}
