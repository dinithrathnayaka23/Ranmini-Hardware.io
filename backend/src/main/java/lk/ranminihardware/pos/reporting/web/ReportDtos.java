package lk.ranminihardware.pos.reporting.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import lk.ranminihardware.pos.sales.domain.DailySalesSummary;

/**
 * Response shapes for the reports screen.
 *
 * <p>Field names follow the frontend's existing reporting types, so the charts
 * can be wired without a translation layer.
 */
public final class ReportDtos {

  private ReportDtos() {}

  /** The four figures above the charts. */
  public record PeriodTotals(
      long transactions,
      long unitsSold,
      BigDecimal revenue,
      BigDecimal profit,
      BigDecimal averageSale) {}

  /**
   * One point on the revenue trend, and one row of the daily table.
   *
   * <p>Both come from the same pre-aggregated document, so the chart and the
   * table beneath it can never disagree.
   */
  public record DailyPoint(
      LocalDate date,
      long transactions,
      long unitsSold,
      BigDecimal revenue,
      BigDecimal profit,
      BigDecimal discountTotal) {

    public static DailyPoint from(DailySalesSummary day) {
      return new DailyPoint(
          LocalDate.parse(day.getDate()),
          day.getTransactions(),
          day.getUnitsSold(),
          day.getNetRevenue(),
          day.getProfit(),
          day.getDiscountTotal());
    }
  }

  /**
   * One slice of the category distribution.
   *
   * @param share fraction of the returned rows' revenue, 0..1 — the frontend
   *     formats it as a percentage and assigns the colour, since chart colours
   *     come from a fixed palette order rather than from the data
   */
  public record CategoryShare(String id, String label, BigDecimal revenue, BigDecimal share) {}

  /** A row in the best-sellers list. */
  public record TopProduct(
      String id, String name, String sku, long unitsSold, BigDecimal revenue) {}
}
