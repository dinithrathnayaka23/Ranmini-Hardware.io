package lk.ranminihardware.pos.sales.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One document per trading day, holding that day totals already added up.
 *
 * <p><b>This is the main reason reporting stays fast as the shop grows.</b> The
 * obvious way to draw a sales chart is to aggregate the sales collection over a
 * date range every time somebody opens the reports page. That works beautifully
 * for a month of data and gets steadily worse forever: by year three the shop is
 * scanning six figures of documents to draw thirty points.
 *
 * <p>Instead each completed sale increments the counters here, atomically, as it
 * lands. A month chart then reads thirty small documents by an indexed date
 * range, and the cost of a report stops depending on how long the shop has been
 * trading.
 *
 * <p>The trade is that these figures are derived data and could in principle
 * drift from the sales they summarise. That is accepted deliberately, and made
 * recoverable: every field here can be rebuilt from the sales collection, which
 * remains the system of record.
 */
@Document(collection = "daily_sales_summary")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailySalesSummary {

  /**
   * The trading day in ISO form, e.g. "2026-08-31" — and also the document id.
   *
   * <p>Using the date itself as {@code _id} means the concurrent upsert is
   * guarded by the primary key, needs no second unique index, and every range
   * query runs on the fastest index the collection has.
   */
  @Id private String id;

  /**
   * The trading day, repeated as an ISO string rather than a date type.
   *
   * <p>Deliberate: a BSON date is an instant, so writing "31 August" and reading
   * it back involves two timezone conversions that must agree. They did not —
   * the summary was written at UTC midnight and queried with the JVM's local
   * zone, which silently returned nothing for the current day and made the
   * whole reports screen look empty. An ISO string has one meaning, sorts
   * correctly, and compares correctly with $gte/$lte.
   */
  private String date;

  private long transactions;

  /** Units across all lines, for the "items sold" figure. */
  private long unitsSold;

  /** Sum of subtotals, before discount and tax. */
  private BigDecimal grossRevenue;

  private BigDecimal discountTotal;

  private BigDecimal taxTotal;

  /** Sum of what customers actually paid. */
  private BigDecimal netRevenue;

  private BigDecimal costTotal;

  private BigDecimal profit;

  private Instant updatedAt;
}
