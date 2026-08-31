package lk.ranminihardware.pos.sales.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A completed sale — one receipt.
 *
 * <p>Immutable in practice. A mistake is corrected by voiding the sale and
 * ringing up a new one, never by editing this document: an editable receipt is
 * not a record of anything, and the void leaves both halves of the story in
 * place.
 *
 * <p>This is the collection that grows without limit, so its shape is chosen for
 * how it will be read a year from now. Every figure a report needs is stored,
 * already computed, rather than derived at query time — see the note on
 * {@link #businessDate}.
 */
@Document(collection = "sales")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sale {

  @Id private String id;

  /** Human-facing receipt number, e.g. "INV-20260831-0042". Unique. */
  private String invoiceNumber;

  /**
   * The trading day this sale belongs to, as an ISO string, e.g. 2026-08-31.
   *
   * <p>Stored alongside the timestamp on purpose. Grouping a year of sales by
   * day from {@code soldAt} alone means a {@code $dateToString} over every
   * document on every report, which cannot use an index. A stored day is one
   * indexed range match, and it also lets the shop decide that a sale rung up
   * at 00:30 belongs to the previous trading day without rewriting reports.
   *
   * <p>A string rather than a date type, deliberately. A BSON date is an
   * instant, so a trading day written by the service and read back by a query
   * involves two timezone conversions that have to agree. They did not, and
   * range queries silently returned nothing for the current day. An ISO string
   * has exactly one meaning and compares correctly with $gte and $lte.
   */
  private String businessDate;

  private Instant soldAt;

  private String cashierId;

  /** Denormalised so an old receipt still names its cashier after they leave. */
  private String cashierName;

  /** Which till, for shift reconciliation. */
  private String terminalName;

  private List<SaleLine> lines;

  /** Sum of the line totals, before any discount or tax. */
  private BigDecimal subtotal;

  private BigDecimal discountPercent;

  private BigDecimal discountAmount;

  private BigDecimal taxRate;

  private BigDecimal taxAmount;

  /** What the customer actually paid. */
  private BigDecimal total;

  /** Sum of the line costs — stored so profit reports never join to products. */
  private BigDecimal costTotal;

  /** {@code total - taxAmount - costTotal}. */
  private BigDecimal profit;

  private TenderMethod tender;

  /** Cash handed over; null for a card payment. */
  private BigDecimal amountTendered;

  private BigDecimal changeDue;

  @Builder.Default private SaleStatus status = SaleStatus.COMPLETED;

  private Instant voidedAt;

  private String voidReason;

  /**
   * Client-supplied key that makes a retried checkout safe.
   *
   * <p>A till that loses the network after posting a sale cannot tell whether it
   * landed. Without this, the cashier retries and the customer is charged twice
   * and the stock drops twice. With it, the second attempt hits a unique index
   * and is answered with the original sale.
   */
  private String idempotencyKey;
}
