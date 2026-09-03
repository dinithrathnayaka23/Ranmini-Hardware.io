package lk.ranminihardware.pos.shared.pdf;

import com.lowagie.text.Element;
import com.lowagie.text.Image;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import java.math.BigDecimal;
import java.util.List;

/**
 * A column chart, drawn as vectors rather than embedded as a picture.
 *
 * <p>Vectors because these documents are printed. A rasterised chart at screen
 * resolution looks soft on paper and enormous in the file; drawn as lines and
 * rectangles it prints at whatever resolution the printer has and costs a few
 * hundred bytes.
 *
 * <p>The chart is wrapped as an {@link Image} over a PDF template, which is what
 * lets it flow with the surrounding text instead of being pinned to absolute
 * page coordinates. Absolute placement is the usual way to draw on a PDF and it
 * is the wrong one here: a section above the chart growing by one line would
 * leave the chart printed over the paragraph beneath it.
 *
 * <p><b>What this chart deliberately does not do</b> is smooth anything. The
 * reports screen draws a monotone-smoothed line, which is honest there because
 * the tooltip gives the exact figure at every point. On paper there are no
 * tooltips, so bars — one per day, height proportional to the day's revenue, and
 * nothing between them to misread — are the form that cannot overstate a peak.
 */
public final class PdfBarChart {

  /** A single column: one trading day. */
  public record Bar(String label, BigDecimal value) {}

  /** Room reserved on the left for the value axis labels. */
  private static final float AXIS_WIDTH = 52F;

  /** Room reserved at the bottom for the date labels. */
  private static final float LABEL_HEIGHT = 14F;

  /** Most date labels to print, whatever the length of the period. */
  private static final int MAX_LABELS = 12;

  private PdfBarChart() {}

  /**
   * Draws the chart.
   *
   * @param currencyFormatter turns an amount into the axis label, so the chart
   *     inherits the shop's own currency symbol rather than guessing one
   */
  public static Image render(
      PdfWriter writer,
      float width,
      float height,
      List<Bar> bars,
      java.util.function.Function<BigDecimal, String> currencyFormatter) {

    PdfTemplate canvas = writer.getDirectContent().createTemplate(width, height);

    float plotLeft = AXIS_WIDTH;
    float plotRight = width;
    float plotBottom = LABEL_HEIGHT;
    float plotTop = height;
    float plotWidth = plotRight - plotLeft;
    float plotHeight = plotTop - plotBottom;

    BigDecimal peak = peak(bars);

    // Three gridlines — zero, half, peak. More would turn a small chart into a
    // grid with bars in it; fewer leaves the eye no reference at all.
    for (int i = 0; i <= 2; i++) {
      float y = plotBottom + (plotHeight * i / 2F);

      canvas.setLineWidth(i == 0 ? 0.7F : 0.4F);
      canvas.setColorStroke(PdfTheme.LINE);
      canvas.moveTo(plotLeft, y);
      canvas.lineTo(plotRight, y);
      canvas.stroke();

      BigDecimal value = peak.multiply(BigDecimal.valueOf(i)).divide(BigDecimal.valueOf(2));
      ColumnText.showTextAligned(
          canvas,
          Element.ALIGN_RIGHT,
          new Phrase(currencyFormatter.apply(value), PdfTheme.SMALL),
          plotLeft - 6F,
          y - 2.5F,
          0F);
    }

    if (bars.isEmpty()) {
      ColumnText.showTextAligned(
          canvas,
          Element.ALIGN_CENTER,
          new Phrase("No sales in this period.", PdfTheme.SMALL),
          plotLeft + plotWidth / 2F,
          plotBottom + plotHeight / 2F,
          0F);
      return image(canvas, width, height);
    }

    float slot = plotWidth / bars.size();
    // A bar keeps a quarter of its slot as breathing room, but never grows past
    // 22pt: with five days in the period, bars as wide as they are tall read as
    // blocks rather than as a series.
    float barWidth = Math.min(slot * 0.7F, 22F);
    int labelStride = Math.max(1, (int) Math.ceil(bars.size() / (double) MAX_LABELS));

    for (int i = 0; i < bars.size(); i++) {
      Bar bar = bars.get(i);
      float centre = plotLeft + slot * (i + 0.5F);
      float barHeight = scale(bar.value(), peak, plotHeight);

      if (barHeight > 0F) {
        canvas.setColorFill(PdfTheme.BRAND);
        canvas.rectangle(centre - barWidth / 2F, plotBottom, barWidth, barHeight);
        canvas.fill();
      }

      if (i % labelStride == 0) {
        ColumnText.showTextAligned(
            canvas,
            Element.ALIGN_CENTER,
            new Phrase(bar.label(), PdfTheme.SMALL),
            centre,
            plotBottom - 10F,
            0F);
      }
    }

    return image(canvas, width, height);
  }

  private static Image image(PdfTemplate canvas, float width, float height) {
    Image image = Image.getInstance(canvas);
    image.scaleAbsolute(width, height);
    image.setSpacingBefore(10F);
    image.setSpacingAfter(4F);
    return image;
  }

  /**
   * The value the tallest bar represents.
   *
   * <p>Scaled against the actual maximum rather than a rounded one, which is the
   * same rule the on-screen charts follow: the tallest bar reaches the top, so
   * bar length and printed figure always agree.
   */
  private static BigDecimal peak(List<Bar> bars) {
    BigDecimal max =
        bars.stream()
            .map(bar -> bar.value() == null ? BigDecimal.ZERO : bar.value())
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);

    // A period with no sales still needs a scale, or every bar divides by zero.
    return max.signum() <= 0 ? BigDecimal.ONE : max;
  }

  private static float scale(BigDecimal value, BigDecimal peak, float plotHeight) {
    if (value == null || value.signum() <= 0) return 0F;
    return value.floatValue() / peak.floatValue() * plotHeight;
  }
}
