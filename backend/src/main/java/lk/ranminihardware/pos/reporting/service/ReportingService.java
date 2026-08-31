package lk.ranminihardware.pos.reporting.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lk.ranminihardware.pos.reporting.web.ReportDtos;
import lk.ranminihardware.pos.sales.domain.DailySalesSummary;
import lk.ranminihardware.pos.sales.repository.DailySalesSummaryRepository;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.money.Money;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/**
 * Sales analytics.
 *
 * <p>Two different strategies, chosen per question:
 *
 * <ul>
 *   <li><b>Anything by day</b> — the revenue trend, the daily summary table, the
 *       period totals — reads the pre-aggregated {@code daily_sales_summary}
 *       collection. Thirty documents for a month chart, regardless of whether
 *       the shop made thirty sales that month or thirty thousand.
 *   <li><b>Anything by product or category</b> reads the sales collection with
 *       an aggregation, because those breakdowns cannot be pre-summed without a
 *       document per product per day. The date range is bounded so the scan is
 *       always over an indexed slice rather than the whole history.
 * </ul>
 */
@Service
public class ReportingService {

  private static final String SALES = "sales";

  /**
   * The widest range a product or category breakdown may cover.
   *
   * <p>Those two aggregate over raw sales, so an unbounded range would scan
   * every sale the shop has ever made. A year is more than any reporting screen
   * asks for, and refusing beyond it is better than serving a request that times
   * out.
   */
  private static final long MAX_BREAKDOWN_DAYS = 366;

  private final DailySalesSummaryRepository summaries;
  private final MongoTemplate mongo;

  public ReportingService(DailySalesSummaryRepository summaries, MongoTemplate mongo) {
    this.summaries = summaries;
    this.mongo = mongo;
  }

  /** The revenue trend line and the daily summary table share this read. */
  public List<DailySalesSummary> dailySeries(LocalDate from, LocalDate to) {
    validateRange(from, to);
    return summaries.findInDateRange(from.toString(), to.toString());
  }

  /** Period totals — the four figures above the charts. */
  public ReportDtos.PeriodTotals totals(LocalDate from, LocalDate to) {
    List<DailySalesSummary> days = dailySeries(from, to);

    long transactions = 0;
    long units = 0;
    BigDecimal revenue = Money.ZERO;
    BigDecimal profit = Money.ZERO;

    for (DailySalesSummary day : days) {
      transactions += day.getTransactions();
      units += day.getUnitsSold();
      revenue = Money.add(revenue, day.getNetRevenue());
      profit = Money.add(profit, day.getProfit());
    }

    // Averaged over days that actually traded, not calendar days: a shop closed
    // on Sunday should not see its average takings dragged down by it.
    BigDecimal averageSale =
        transactions == 0
            ? Money.ZERO
            : Money.of(
                revenue.divide(
                    BigDecimal.valueOf(transactions), Money.SCALE, java.math.RoundingMode.HALF_UP));

    return new ReportDtos.PeriodTotals(transactions, units, revenue, profit, averageSale);
  }

  /**
   * Revenue share by category.
   *
   * <p>Groups on the category copied onto each sale line, so no lookup into
   * products is needed and the numbers stay true to what the categories were at
   * the time of sale.
   */
  public List<ReportDtos.CategoryShare> categoryShares(LocalDate from, LocalDate to, int limit) {
    validateBreakdownRange(from, to);

    List<Document> pipeline =
        List.of(
            matchCompletedInRange(from, to),
            new Document("$unwind", "$lines"),
            new Document(
                "$group",
                new Document("_id", "$lines.categoryId")
                    .append("label", new Document("$first", "$lines.categoryName"))
                    .append("revenue", new Document("$sum", "$lines.lineTotal"))),
            new Document("$sort", new Document("revenue", -1)),
            new Document("$limit", Math.clamp(limit, 1, 50)));

    List<ReportDtos.CategoryShare> rows = new ArrayList<>();
    BigDecimal total = Money.ZERO;

    for (Document doc : mongo.getCollection(SALES).aggregate(pipeline)) {
      BigDecimal revenue = decimal(doc.get("revenue"));
      total = Money.add(total, revenue);
      rows.add(
          new ReportDtos.CategoryShare(
              doc.getString("_id"), doc.getString("label"), revenue, BigDecimal.ZERO));
    }

    // The share is computed after the fact so the fractions always add up to the
    // rows actually returned, rather than to a total that includes a tail the
    // caller never sees.
    List<ReportDtos.CategoryShare> withShares = new ArrayList<>(rows.size());
    for (ReportDtos.CategoryShare row : rows) {
      BigDecimal share =
          total.signum() == 0
              ? BigDecimal.ZERO
              : row.revenue().divide(total, 4, java.math.RoundingMode.HALF_UP);
      withShares.add(
          new ReportDtos.CategoryShare(row.id(), row.label(), row.revenue(), share));
    }
    return withShares;
  }

  /** Best sellers by units moved. */
  public List<ReportDtos.TopProduct> topProducts(LocalDate from, LocalDate to, int limit) {
    validateBreakdownRange(from, to);

    List<Document> pipeline =
        List.of(
            matchCompletedInRange(from, to),
            new Document("$unwind", "$lines"),
            new Document(
                "$group",
                new Document("_id", "$lines.productId")
                    .append("name", new Document("$first", "$lines.name"))
                    .append("sku", new Document("$first", "$lines.sku"))
                    .append("unitsSold", new Document("$sum", "$lines.quantity"))
                    .append("revenue", new Document("$sum", "$lines.lineTotal"))),
            new Document("$sort", new Document("unitsSold", -1)),
            new Document("$limit", Math.clamp(limit, 1, 50)));

    List<ReportDtos.TopProduct> rows = new ArrayList<>();
    for (Document doc : mongo.getCollection(SALES).aggregate(pipeline)) {
      rows.add(
          new ReportDtos.TopProduct(
              doc.getString("_id"),
              doc.getString("name"),
              doc.getString("sku"),
              longValue(doc.get("unitsSold")),
              decimal(doc.get("revenue"))));
    }
    return rows;
  }

  /**
   * Matches completed sales within the range.
   *
   * <p>Voided sales are excluded everywhere in reporting. They are still in the
   * collection — the record of a corrected mistake belongs there — but counting
   * them as revenue would overstate the shop's takings.
   */
  private Document matchCompletedInRange(LocalDate from, LocalDate to) {
    return new Document(
        "$match",
        new Document("status", "COMPLETED")
            // Compared as ISO strings, matching how the trading day is stored.
            // See the note on Sale.businessDate for why it is not a date type.
            .append(
                "businessDate",
                new Document("$gte", from.toString()).append("$lte", to.toString())));
  }

  private void validateRange(LocalDate from, LocalDate to) {
    if (from == null || to == null || from.isAfter(to)) {
      throw ApiException.badRequest("INVALID_RANGE", "The start date must be on or before the end date.");
    }
  }

  private void validateBreakdownRange(LocalDate from, LocalDate to) {
    validateRange(from, to);
    if (from.plusDays(MAX_BREAKDOWN_DAYS).isBefore(to)) {
      throw ApiException.badRequest(
          "RANGE_TOO_WIDE", "Product and category breakdowns cover at most one year at a time.");
    }
  }

  private static BigDecimal decimal(Object value) {
    if (value instanceof Decimal128 d) return d.bigDecimalValue();
    if (value instanceof BigDecimal d) return d;
    if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    return BigDecimal.ZERO;
  }

  private static long longValue(Object value) {
    return value instanceof Number n ? n.longValue() : 0L;
  }
}
