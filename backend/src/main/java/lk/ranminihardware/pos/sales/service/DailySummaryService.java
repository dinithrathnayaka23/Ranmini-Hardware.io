package lk.ranminihardware.pos.sales.service;

import com.mongodb.client.model.UpdateOptions;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Date;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.SaleLine;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/**
 * Keeps the pre-aggregated daily totals up to date.
 *
 * <p><b>This is what keeps reporting fast as the shop grows.</b> Drawing a sales
 * chart by aggregating the sales collection over a date range works beautifully
 * for a month of data and gets steadily worse forever — by year three the shop
 * is scanning six figures of documents to draw thirty points. Incrementing a
 * per-day document as each sale lands means the chart reads thirty small
 * documents by an indexed range instead, and the cost of a report stops
 * depending on how long the business has been trading.
 *
 * <p>The update is a single atomic {@code $inc} upsert, so two tills closing a
 * sale in the same instant both count. Anything else — read, add, write — would
 * lose one of them.
 */
@Service
public class DailySummaryService {

  private static final Logger log = LoggerFactory.getLogger(DailySummaryService.class);
  private static final String COLLECTION = "daily_sales_summary";

  private final MongoTemplate mongo;

  public DailySummaryService(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  /** Adds a completed sale to its day's totals. */
  public void record(Sale sale) {
    apply(sale, 1);
  }

  /**
   * Backs a voided sale out of its day's totals.
   *
   * <p>Subtracting rather than recomputing keeps the operation atomic and O(1).
   * The day's figures stay consistent with the sales that remain, and the void
   * itself is still visible in the sales collection.
   */
  public void reverse(Sale sale) {
    apply(sale, -1);
  }

  /**
   * Applies a sale to its day's counters with the given sign.
   *
   * <p>Failures are logged, not thrown. These figures are derived data and can
   * be rebuilt from the sales collection, which remains the system of record —
   * so a summary problem must never fail a sale the customer has already paid
   * for and whose stock has already left the shelf.
   */
  private void apply(Sale sale, int sign) {
    try {
      long units = 0;
      for (SaleLine line : sale.getLines()) {
        units += line.getQuantity();
      }

      Document increments =
          new Document("transactions", sign)
              .append("unitsSold", units * sign)
              .append("grossRevenue", signed(sale.getSubtotal(), sign))
              .append("discountTotal", signed(sale.getDiscountAmount(), sign))
              .append("taxTotal", signed(sale.getTaxAmount(), sign))
              .append("netRevenue", signed(sale.getTotal(), sign))
              .append("costTotal", signed(sale.getCostTotal(), sign))
              .append("profit", signed(sale.getProfit(), sign));

      LocalDate date = sale.getBusinessDate();

      mongo
          .getCollection(COLLECTION)
          .updateOne(
              new Document("_id", date.toString()),
              new Document("$inc", increments)
                  // `date` is set rather than incremented, and only on insert
                  // for the immutable parts. Stored as a UTC instant so range
                  // queries use the index.
                  .append(
                      "$set",
                      new Document("updatedAt", Date.from(Instant.now()))
                          .append("date", Date.from(date.atStartOfDay(ZoneOffset.UTC).toInstant()))),
              new UpdateOptions().upsert(true));

    } catch (RuntimeException ex) {
      log.error(
          "Daily summary update failed for sale {} on {} — figures can be rebuilt from sales",
          sale.getInvoiceNumber(),
          sale.getBusinessDate(),
          ex);
    }
  }

  /**
   * Money as a {@code Decimal128} delta.
   *
   * <p>{@code $inc} on a Decimal128 stays exact, which is the whole reason
   * amounts are stored that way — incrementing a double here would drift the
   * day's revenue by cents over a few hundred sales.
   */
  private static Decimal128 signed(BigDecimal amount, int sign) {
    BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
    return new Decimal128(sign < 0 ? value.negate() : value);
  }
}
