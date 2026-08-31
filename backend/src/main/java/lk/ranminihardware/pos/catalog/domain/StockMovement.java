package lk.ranminihardware.pos.catalog.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import lk.ranminihardware.pos.catalog.api.StockChangeReason;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One recorded change to a product's stock.
 *
 * <p>This is the ledger behind the stock number. Without it, a disagreement
 * between the shelf and the screen is unanswerable — with it, the shop can see
 * that 40 bags arrived on Tuesday, 12 sold, and 2 were written off as damaged.
 * It is also the recovery path if a checkout ever fails between taking stock and
 * recording the sale.
 *
 * <p>Written on every movement, so this is the fastest-growing collection in the
 * system. It is also the least useful once it is old, which is why it carries a
 * TTL index (see {@code MongoIndexInitializer}) and expires itself after two
 * years rather than relying on a cleanup job somebody has to remember to run.
 */
@Document(collection = "stock_movements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovement {

  @Id private String id;

  private String productId;

  /** Denormalised so the audit trail stays readable if a product is renamed. */
  private String sku;

  /** Signed: negative for a sale or a write-off, positive for a delivery. */
  private int delta;

  /**
   * Stock on hand immediately after this movement, as reported by the atomic
   * update that made it. Stored so the ledger can be replayed and checked
   * against the product document without re-deriving every step.
   */
  private int resultingStock;

  private StockChangeReason reason;

  /** What caused it — a sale id, an adjustment note. */
  private String referenceId;

  /** Free text for corrections: "stocktake", "damaged in transit". */
  private String note;

  private Instant occurredAt;
}
