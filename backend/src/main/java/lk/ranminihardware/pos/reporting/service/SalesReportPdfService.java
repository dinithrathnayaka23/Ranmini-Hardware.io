package lk.ranminihardware.pos.reporting.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import lk.ranminihardware.pos.reporting.web.ReportDtos;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.pdf.PdfBarChart;
import lk.ranminihardware.pos.shared.pdf.PdfReport;
import lk.ranminihardware.pos.shared.pdf.PdfTheme;
import org.springframework.stereotype.Service;

/**
 * The printable sales and analytics report.
 *
 * <p><b>This is the report.</b> The portal had a "Generate Report" screen that
 * was never designed and never built, sitting next to a reports page that could
 * only be printed by the browser. There is no builder: the period the owner is
 * already looking at is the period they want on paper, so the export takes that
 * range and produces the whole thing — headline figures, the revenue trend as a
 * chart, where the money came from by category, the best sellers, and the day
 * by day table underneath.
 *
 * <p>Everything comes from the same {@code ReportingService} the screen reads,
 * so the paper and the screen cannot disagree. In particular the daily figures
 * come from the pre-aggregated daily summaries rather than from a fresh scan of
 * the sales collection — a report that recomputed its own totals would be a
 * second opinion, and two opinions about yesterday's takings is one too many.
 */
@Service
public class SalesReportPdfService {

  /** Categories in the breakdown. Beyond this the tail is noise on a page. */
  private static final int CATEGORY_LIMIT = 8;

  /** Best sellers listed. Ten is a page of useful detail; fifty is a catalogue. */
  private static final int TOP_PRODUCT_LIMIT = 10;

  /**
   * Longest period the day-by-day table will print in full.
   *
   * <p>A year of daily rows is fourteen pages of table nobody reads. Past this
   * the chart and the totals still cover the whole period and the table says it
   * was omitted, which is more useful than a document too long to open.
   */
  private static final int MAX_DAILY_ROWS = 120;

  private static final DateTimeFormatter STAMP =
      DateTimeFormatter.ofPattern("d MMM yyyy 'at' HH:mm");

  private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("d MMM yyyy");

  private static final DateTimeFormatter ROW_DATE = DateTimeFormatter.ofPattern("EEE d MMM");

  /** Axis and bar labels: short, because a chart has no room for a full date. */
  private static final DateTimeFormatter CHART_DATE = DateTimeFormatter.ofPattern("d MMM");

  private final ReportingService reporting;
  private final SettingsService settings;
  private final Clock clock;

  public SalesReportPdfService(
      ReportingService reporting, SettingsService settings, Clock clock) {
    this.reporting = reporting;
    this.settings = settings;
    this.clock = clock;
  }

  /**
   * Renders the report for one period.
   *
   * @param requestedBy the signed-in administrator, printed in the letterhead so
   *     a copy filed away six months later is accountable to somebody
   */
  public byte[] render(LocalDate from, LocalDate to, String requestedBy) {
    ShopSettings shop = settings.get();
    String currency = currencySymbol(shop);

    ReportDtos.PeriodTotals totals = reporting.totals(from, to);
    List<ReportDtos.DailyPoint> daily =
        reporting.dailySeries(from, to).stream().map(ReportDtos.DailyPoint::from).toList();
    List<ReportDtos.CategoryShare> categories =
        reporting.categoryShares(from, to, CATEGORY_LIMIT);
    List<ReportDtos.TopProduct> topProducts = reporting.topProducts(from, to, TOP_PRODUCT_LIMIT);

    PdfReport.Letterhead letterhead =
        new PdfReport.Letterhead(
            shop.getProfile().getCompanyName(),
            shopDetails(shop),
            "Sales & Analytics Report",
            "%s to %s · %d days".formatted(
                from.format(LONG_DATE), to.format(LONG_DATE), daysBetween(from, to)),
            requestedBy,
            LocalDateTime.now(clock).format(STAMP));

    return PdfReport.render(
        PageSize.A4,
        letterhead,
        (document, writer) -> {
          writeHeadline(document, totals, currency);
          writeTrend(document, writer, daily, currency);
          writeCategories(document, categories, currency);
          writeTopProducts(document, topProducts, currency);
          writeDailyTable(document, daily, currency);
        });
  }

  /** The five figures the reports screen shows above its charts. */
  private void writeHeadline(
      Document document, ReportDtos.PeriodTotals totals, String currency) {

    document.add(PdfReport.section("The period in figures"));

    PdfPTable cards = new PdfPTable(3);
    cards.setWidthPercentage(100F);
    cards.setSpacingBefore(8F);

    cards.addCell(card("Revenue", money(totals.revenue(), currency)));
    cards.addCell(card("Profit", money(totals.profit(), currency)));
    cards.addCell(card("Average sale", money(totals.averageSale(), currency)));
    cards.addCell(card("Transactions", count(totals.transactions())));
    cards.addCell(card("Units sold", count(totals.unitsSold())));
    cards.addCell(card("Margin", marginShare(totals)));

    document.add(cards);
    document.add(
        PdfReport.note(
            "Revenue is what customers paid. Profit is revenue less tax and less what the"
                + " stock cost the shop."));
  }

  /** Daily revenue as a column chart. */
  private void writeTrend(
      Document document,
      com.lowagie.text.pdf.PdfWriter writer,
      List<ReportDtos.DailyPoint> daily,
      String currency) {

    document.add(PdfReport.section("Revenue by day"));

    List<PdfBarChart.Bar> bars =
        daily.stream()
            .map(point -> new PdfBarChart.Bar(point.date().format(CHART_DATE), point.revenue()))
            .toList();

    float width = PageSize.A4.getWidth() - 72F;
    document.add(PdfBarChart.render(writer, width, 150F, bars, amount -> compact(amount, currency)));
  }

  /**
   * Where the money came from.
   *
   * <p>A table rather than the donut the screen draws. On paper a pie has to be
   * read against a legend, and the figures beside the labels are what somebody
   * actually wants to compare — which is why the on-screen donut prints its
   * percentages in a legend too.
   */
  private void writeCategories(
      Document document, List<ReportDtos.CategoryShare> categories, String currency) {

    document.add(PdfReport.section("Revenue by category"));

    PdfPTable table = PdfTheme.table(4F, 2F, 1.4F);
    table.addCell(PdfTheme.head("Category", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Revenue", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Share", Element.ALIGN_RIGHT));

    if (categories.isEmpty()) {
      table.addCell(emptyRow("No sales in this period.", 3));
      document.add(table);
      return;
    }

    boolean tinted = false;
    for (ReportDtos.CategoryShare category : categories) {
      table.addCell(PdfTheme.cell(category.label(), Element.ALIGN_LEFT, tinted));
      table.addCell(PdfTheme.cell(money(category.revenue(), currency), Element.ALIGN_RIGHT, tinted));
      table.addCell(PdfTheme.cell(percent(category.share()), Element.ALIGN_RIGHT, tinted));
      tinted = !tinted;
    }

    document.add(table);
    document.add(
        PdfReport.note(
            ("Share is of the %d categories listed. A shop with a long tail of small"
                    + " categories will not see all of them here.")
                .formatted(categories.size())));
  }

  private void writeTopProducts(
      Document document, List<ReportDtos.TopProduct> products, String currency) {

    document.add(PdfReport.section("Best sellers"));

    PdfPTable table = PdfTheme.table(0.7F, 4F, 1.8F, 1.4F, 2F);
    table.addCell(PdfTheme.head("#", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Product", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("SKU", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Units", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Revenue", Element.ALIGN_RIGHT));

    if (products.isEmpty()) {
      table.addCell(emptyRow("No sales in this period.", 5));
      document.add(table);
      return;
    }

    boolean tinted = false;
    int rank = 1;
    for (ReportDtos.TopProduct product : products) {
      table.addCell(PdfTheme.cell(String.valueOf(rank++), Element.ALIGN_RIGHT, tinted));
      table.addCell(PdfTheme.cell(product.name(), Element.ALIGN_LEFT, tinted));
      table.addCell(PdfTheme.cell(product.sku(), Element.ALIGN_LEFT, tinted));
      table.addCell(PdfTheme.cell(count(product.unitsSold()), Element.ALIGN_RIGHT, tinted));
      table.addCell(PdfTheme.cell(money(product.revenue(), currency), Element.ALIGN_RIGHT, tinted));
      tinted = !tinted;
    }

    document.add(table);
  }

  /**
   * Every trading day in the period, with a total row.
   *
   * <p>The same rows the chart above was drawn from, printed as figures. A chart
   * shows the shape of a month; this is what somebody checks a specific
   * Tuesday against.
   */
  private void writeDailyTable(
      Document document, List<ReportDtos.DailyPoint> daily, String currency) {

    document.add(PdfReport.section("Day by day"));

    PdfPTable table = PdfTheme.table(2.2F, 1.3F, 1.2F, 2F, 2F, 1.8F);
    table.addCell(PdfTheme.head("Date", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.head("Sales", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Units", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Revenue", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Profit", Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.head("Discounts", Element.ALIGN_RIGHT));

    if (daily.isEmpty()) {
      table.addCell(emptyRow("No trading days with sales in this period.", 6));
      document.add(table);
      return;
    }

    List<ReportDtos.DailyPoint> shown =
        daily.size() > MAX_DAILY_ROWS ? daily.subList(0, MAX_DAILY_ROWS) : daily;

    long transactions = 0;
    long units = 0;
    BigDecimal revenue = BigDecimal.ZERO;
    BigDecimal profit = BigDecimal.ZERO;
    BigDecimal discounts = BigDecimal.ZERO;
    boolean tinted = false;

    for (ReportDtos.DailyPoint point : shown) {
      table.addCell(PdfTheme.cell(point.date().format(ROW_DATE), Element.ALIGN_LEFT, tinted));
      table.addCell(PdfTheme.cell(count(point.transactions()), Element.ALIGN_RIGHT, tinted));
      table.addCell(PdfTheme.cell(count(point.unitsSold()), Element.ALIGN_RIGHT, tinted));
      table.addCell(PdfTheme.cell(money(point.revenue(), currency), Element.ALIGN_RIGHT, tinted));
      table.addCell(PdfTheme.cell(money(point.profit(), currency), Element.ALIGN_RIGHT, tinted));
      table.addCell(
          PdfTheme.cell(money(point.discountTotal(), currency), Element.ALIGN_RIGHT, tinted));
      tinted = !tinted;

      transactions += point.transactions();
      units += point.unitsSold();
      revenue = revenue.add(orZero(point.revenue()));
      profit = profit.add(orZero(point.profit()));
      discounts = discounts.add(orZero(point.discountTotal()));
    }

    table.addCell(PdfTheme.groupCell("Total", Element.ALIGN_LEFT));
    table.addCell(PdfTheme.groupCell(count(transactions), Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.groupCell(count(units), Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.groupCell(money(revenue, currency), Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.groupCell(money(profit, currency), Element.ALIGN_RIGHT));
    table.addCell(PdfTheme.groupCell(money(discounts, currency), Element.ALIGN_RIGHT));

    document.add(table);

    if (shown.size() < daily.size()) {
      document.add(
          PdfReport.note(
              ("Showing the first %d of %d trading days. The figures above cover the whole"
                      + " period; choose a shorter range to list every day.")
                  .formatted(shown.size(), daily.size())));
    }
  }

  private PdfPCell card(String label, String value) {
    PdfPCell cell = new PdfPCell();
    cell.setBorderColor(PdfTheme.LINE);
    cell.setBorderWidth(0.6F);
    cell.setBackgroundColor(PdfTheme.ROW_FILL);
    cell.setPadding(9F);

    Paragraph caption = new Paragraph(label, PdfTheme.SMALL);
    Paragraph figure = new Paragraph(value, PdfTheme.font(14F, Font.BOLD, PdfTheme.INK));
    figure.setSpacingBefore(3F);

    cell.addElement(caption);
    cell.addElement(figure);
    return cell;
  }

  private PdfPCell emptyRow(String message, int columns) {
    PdfPCell cell = PdfTheme.cell(message, Element.ALIGN_CENTER, false);
    cell.setColspan(columns);
    cell.setPaddingTop(14F);
    cell.setPaddingBottom(14F);
    return cell;
  }

  /**
   * Profit as a share of revenue.
   *
   * <p>Printed because it is the one figure that says whether a good month was
   * good business: revenue can rise while margin falls, and the two numbers side
   * by side do not show it.
   */
  private static String marginShare(ReportDtos.PeriodTotals totals) {
    BigDecimal revenue = orZero(totals.revenue());
    if (revenue.signum() <= 0) return "—";

    return orZero(totals.profit())
            .multiply(BigDecimal.valueOf(100))
            .divide(revenue, 1, RoundingMode.HALF_UP)
        + "%";
  }

  private static long daysBetween(LocalDate from, LocalDate to) {
    return java.time.temporal.ChronoUnit.DAYS.between(from, to) + 1;
  }

  private static String shopDetails(ShopSettings shop) {
    ShopSettings.ShopProfile profile = shop.getProfile();
    List<String> parts = new ArrayList<>();

    if (notBlank(profile.getPrimaryAddress())) {
      parts.add(profile.getPrimaryAddress().replaceAll("\\s*\\R\\s*", ", "));
    }
    if (notBlank(profile.getContactPhone())) parts.add(profile.getContactPhone());
    if (notBlank(profile.getContactEmail())) parts.add(profile.getContactEmail());

    return String.join(" · ", parts);
  }

  private static String currencySymbol(ShopSettings shop) {
    String symbol = shop.getBusinessLogic().getCurrencySymbol();
    return symbol == null || symbol.isBlank() ? "Rs." : symbol;
  }

  private static String money(BigDecimal amount, String currency) {
    return "%s %,.2f".formatted(currency, orZero(amount).setScale(2, RoundingMode.HALF_UP));
  }

  /**
   * A shortened amount, for a chart axis where a full total does not fit.
   *
   * <p>Thousands and millions only — a shop's daily takings never need more, and
   * a scale that changes suffix mid-axis is harder to read than one that does
   * not.
   */
  private static String compact(BigDecimal amount, String currency) {
    BigDecimal value = orZero(amount);

    if (value.compareTo(BigDecimal.valueOf(1_000_000)) >= 0) {
      return "%s %.1fM".formatted(currency, value.doubleValue() / 1_000_000);
    }
    if (value.compareTo(BigDecimal.valueOf(1_000)) >= 0) {
      return "%s %.0fk".formatted(currency, value.doubleValue() / 1_000);
    }
    return "%s %.0f".formatted(currency, value.doubleValue());
  }

  /** A share stored as a 0..1 fraction, printed as a percentage. */
  private static String percent(BigDecimal share) {
    return orZero(share).multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP) + "%";
  }

  private static String count(long value) {
    return "%,d".formatted(value);
  }

  private static BigDecimal orZero(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }
}
