package lk.ranminihardware.pos.shared.pdf;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import java.io.ByteArrayOutputStream;
import lk.ranminihardware.pos.shared.error.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Opens, letterheads and closes a PDF, so each report only has to write its own
 * middle.
 *
 * <p>Everything that must be identical across documents lives here: the shop's
 * details at the top, the page numbering at the bottom, the margins, and the
 * fact that the whole thing is built in memory and handed back as bytes.
 *
 * <p><b>Built in memory rather than streamed to the response.</b> These are
 * kilobytes — a four-hundred-line inventory lands around 60KB — and buffering
 * means a failure halfway through produces a clean error instead of a truncated
 * file the browser has already started saving as a valid download.
 */
public final class PdfReport {

  /** Generous enough for a two-line letterhead and a page footer. */
  private static final float MARGIN = 36F;

  private static final float FOOTER_MARGIN = 42F;

  private PdfReport() {}

  /**
   * Writes a report's own content.
   *
   * <p>Handed the writer as well as the document because anything drawn rather
   * than typeset — a chart — needs the writer to create the template it draws
   * on. A plain {@code Consumer<Document>} would push every report that wants a
   * chart into holding the writer in a field, which is how a service ends up
   * with per-request state.
   */
  @FunctionalInterface
  public interface Body {
    void write(Document document, PdfWriter writer);
  }

  /**
   * What goes at the top of every page one, and in every page footer.
   *
   * @param shopName from settings, so the paperwork carries the shop's own name
   *     rather than a constant compiled into the service
   * @param shopDetails address and contact, already joined into one line
   * @param title what this document is
   * @param subtitle the period, the filters — whatever narrows the title
   * @param generatedFor who asked for it, which is what makes a printout that
   *     turns up in a drawer six months later accountable to somebody
   * @param generatedAt formatted in the shop's own timezone by the caller
   */
  public record Letterhead(
      String shopName,
      String shopDetails,
      String title,
      String subtitle,
      String generatedFor,
      String generatedAt) {}

  /**
   * Renders a document.
   *
   * @param pageSize portrait A4 for a report, landscape for a wide table
   * @param body writes the report's own content; the letterhead and footer are
   *     already in place
   */
  public static byte[] render(Rectangle pageSize, Letterhead letterhead, Body body) {

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Document document = new Document(pageSize, MARGIN, MARGIN, MARGIN, FOOTER_MARGIN);

    try {
      PdfWriter writer = PdfWriter.getInstance(document, out);
      writer.setPageEvent(new Footer(letterhead));

      // Metadata a filing system can read. The subject line carries the period
      // so a folder of exports is sortable without opening each one.
      document.addTitle("%s — %s".formatted(letterhead.shopName(), letterhead.title()));
      document.addSubject(letterhead.subtitle());
      document.addCreator(letterhead.shopName());

      document.open();
      writeLetterhead(document, letterhead);
      body.write(document, writer);
      document.close();
    } catch (RuntimeException ex) {
      // The report is a read of data that is already there, so a failure here is
      // this service's fault, not the caller's — reported as such rather than as
      // a bad request the user could fix by trying different filters. The cause
      // is deliberately not echoed: it would name internals to a browser.
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "PDF_FAILED",
          "The report could not be generated. Please try again.");
    }

    return out.toByteArray();
  }

  /**
   * The shop's details, the document's title, and who asked for it.
   *
   * <p>Laid out as a two-column table rather than centred paragraphs: the shop
   * on the left and the document's provenance on the right is how an invoice or
   * a stock sheet is conventionally read, and a printout that looks like
   * correspondence is one a shopkeeper is willing to hand to an accountant.
   */
  private static void writeLetterhead(Document document, Letterhead letterhead) {

    PdfPTable header = new PdfPTable(new float[] {1.4F, 1F});
    header.setWidthPercentage(100F);

    PdfPCell shop = new PdfPCell();
    shop.setBorder(Rectangle.NO_BORDER);
    shop.setPaddingBottom(2F);
    shop.addElement(paragraph(letterhead.shopName(), PdfTheme.font(13F, Font.BOLD, PdfTheme.INK)));
    if (notBlank(letterhead.shopDetails())) {
      shop.addElement(paragraph(letterhead.shopDetails(), PdfTheme.SMALL));
    }

    PdfPCell meta = new PdfPCell();
    meta.setBorder(Rectangle.NO_BORDER);
    meta.setHorizontalAlignment(Element.ALIGN_RIGHT);
    meta.addElement(rightParagraph("Generated " + letterhead.generatedAt(), PdfTheme.SMALL));
    if (notBlank(letterhead.generatedFor())) {
      meta.addElement(rightParagraph("By " + letterhead.generatedFor(), PdfTheme.SMALL));
    }

    header.addCell(shop);
    header.addCell(meta);
    document.add(header);

    // The accent rule under the letterhead. Thin and brand-coloured: it
    // separates the heading from the report without costing a band of toner.
    Paragraph rule = new Paragraph();
    rule.setSpacingBefore(4F);
    rule.add(
        new Chunk(new LineSeparator(1.2F, 100F, PdfTheme.BRAND, Element.ALIGN_CENTER, -2F)));
    document.add(rule);

    Paragraph title = paragraph(letterhead.title(), PdfTheme.TITLE);
    title.setSpacingBefore(10F);
    document.add(title);

    if (notBlank(letterhead.subtitle())) {
      document.add(paragraph(letterhead.subtitle(), PdfTheme.SUBTITLE));
    }
  }

  /** A section heading inside a report, with the space it needs around it. */
  public static Paragraph section(String text) {
    Paragraph heading = new Paragraph(text, PdfTheme.SECTION);
    heading.setSpacingBefore(16F);
    heading.setSpacingAfter(2F);
    return heading;
  }

  /** A line of explanatory text under a heading or a table. */
  public static Paragraph note(String text) {
    Paragraph note = new Paragraph(text, PdfTheme.SMALL);
    note.setSpacingBefore(2F);
    return note;
  }

  private static Paragraph paragraph(String text, Font font) {
    Paragraph paragraph = new Paragraph(text, font);
    paragraph.setLeading(font.getSize() * 1.35F);
    return paragraph;
  }

  private static Paragraph rightParagraph(String text, Font font) {
    Paragraph paragraph = paragraph(text, font);
    paragraph.setAlignment(Element.ALIGN_RIGHT);
    return paragraph;
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }

  /**
   * Page numbering and a repeated shop name at the foot of every page.
   *
   * <p>"Page 3 of 12" needs a total that is not known until the document is
   * closed, so the total is drawn into a small reserved template on each page and
   * that template is filled in once at the end. The alternative — rendering the
   * document twice to count its pages — doubles the work for a string.
   */
  private static final class Footer extends PdfPageEventHelper {

    private final Letterhead letterhead;
    private PdfTemplate totalPages;

    private Footer(Letterhead letterhead) {
      this.letterhead = letterhead;
    }

    @Override
    public void onOpenDocument(PdfWriter writer, Document document) {
      totalPages = writer.getDirectContent().createTemplate(40F, 12F);
    }

    @Override
    public void onEndPage(PdfWriter writer, Document document) {
      Rectangle page = document.getPageSize();
      PdfContentByte canvas = writer.getDirectContent();

      float baseline = page.getBottom() + 24F;

      canvas.setColorStroke(PdfTheme.LINE);
      canvas.setLineWidth(0.5F);
      canvas.moveTo(document.leftMargin(), baseline + 10F);
      canvas.lineTo(page.getWidth() - document.rightMargin(), baseline + 10F);
      canvas.stroke();

      Phrase left =
          new Phrase(
              "%s · %s".formatted(letterhead.shopName(), letterhead.title()), PdfTheme.SMALL);
      ColumnText.showTextAligned(
          canvas, Element.ALIGN_LEFT, left, document.leftMargin(), baseline, 0F);

      Phrase pageNumber =
          new Phrase("Page %d of ".formatted(writer.getPageNumber()), PdfTheme.SMALL);
      float right = page.getWidth() - document.rightMargin();
      // Placed relative to the right margin, then the total is stamped into the
      // reserved template immediately after it.
      ColumnText.showTextAligned(
          canvas, Element.ALIGN_RIGHT, pageNumber, right - 22F, baseline, 0F);
      canvas.addTemplate(totalPages, right - 20F, baseline);
    }

    @Override
    public void onCloseDocument(PdfWriter writer, Document document) {
      // One less than the writer reports. By the time the document is closing,
      // the writer has already moved on to the page it would have written next,
      // so its page number is the count plus one — which printed "Page 1 of 2"
      // on a document with exactly one page.
      int pages = Math.max(1, writer.getPageNumber() - 1);

      // Drawn through ColumnText so the font comes from the same Phrase the rest
      // of the footer uses, rather than from a BaseFont this class would have to
      // load and keep in step by hand.
      ColumnText.showTextAligned(
          totalPages,
          Element.ALIGN_LEFT,
          new Phrase(String.valueOf(pages), PdfTheme.SMALL),
          0F,
          0F,
          0F);
    }
  }
}
