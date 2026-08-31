package lk.ranminihardware.pos.sales.domain;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One line of a completed sale, embedded in its {@link Sale}.
 *
 * <p>Embedded rather than a separate collection because a sale is written once
 * and always read whole — printing a receipt, showing an order, refunding it.
 * Splitting the lines out would turn every one of those into a join for no gain,
 * and a hardware order is a handful of lines, nowhere near Mongo's document
 * limit.
 *
 * <p><b>Everything here is a copy, not a reference.</b> The name, the price and
 * the cost are recorded as they were at the moment of sale. That is the whole
 * point: if the shop raises the price of cement next week, last week's receipt
 * must still show what the customer actually paid, and last week's profit must
 * still be computed against what the shop actually paid for it. A report that
 * joins to today's product prices silently rewrites history.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleLine {

  /** Kept so a product's sales history can be found without a text match. */
  private String productId;

  private String sku;

  /** The product name as it read on the day. */
  private String name;

  /** Price charged per unit, at the time of sale. */
  private BigDecimal unitPrice;

  private int quantity;

  /** {@code unitPrice * quantity}, stored so a receipt never re-derives it. */
  private BigDecimal lineTotal;

  /**
   * What the shop had paid for one unit, at the time of sale.
   *
   * <p>Never sent to the till. It is here so profit reporting is historically
   * accurate rather than computed against whatever the cost happens to be when
   * the report is run.
   */
  private BigDecimal unitCost;

  /** {@code unitCost * quantity}. */
  private BigDecimal lineCost;
}
