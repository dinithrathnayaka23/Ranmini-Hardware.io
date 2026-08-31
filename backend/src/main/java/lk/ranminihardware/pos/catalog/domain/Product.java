package lk.ranminihardware.pos.catalog.domain;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * A sellable product.
 *
 * <p><b>Category name is denormalised onto the product.</b> Mongo has no joins
 * worth relying on at scale, and every screen that lists products also shows the
 * category — so storing the name here turns what would be a {@code $lookup} per
 * page into no work at all. The cost is that renaming a category means a bulk
 * update across its products; that is handled in one place, in
 * {@code CategoryService}, and it is the right trade because categories are
 * renamed perhaps once a year while products are listed thousands of times a
 * day.
 *
 * <p>Prices are {@link BigDecimal} and stored as {@code Decimal128}. See
 * {@code Money} for why nothing here is a double.
 */
@Document(collection = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

  @Id private String id;

  /** Shop-facing code, also what the barcode scanner sends. Unique. */
  @Field("sku")
  private String sku;

  private String name;

  /** Optional manufacturer, used as a weaker signal in text search. */
  private String brand;

  private String categoryId;

  /** Denormalised from {@code Category.name} — see the class note above. */
  private String categoryName;

  /** Unit of issue shown on the low-stock panel, e.g. "bags", "pcs". */
  private String unit;

  /** What the shop paid. Needed for profit reporting, never sent to the till. */
  private BigDecimal buyingPrice;

  /** What the customer pays. */
  private BigDecimal sellingPrice;

  /** Units on hand. Only ever changed through an atomic, guarded update. */
  private int stock;

  /** The level at or below which this product counts as low. */
  private int reorderLevel;

  /** Stored so it can be indexed; recomputed on every stock write. */
  private StockStatus status;

  /** Path or URL to a product photo, or null for the neutral tile. */
  private String imageUrl;

  /**
   * Products are deactivated, never deleted.
   *
   * <p>A sale from last year references this document, and a receipt that
   * cannot name what was sold is worthless — to the shop and to an auditor.
   */
  @Builder.Default private boolean active = true;

  @CreatedDate private Instant createdAt;

  @LastModifiedDate private Instant updatedAt;

  /**
   * Guards against two admins editing the same product concurrently. Stock
   * changes do not rely on this — they use a conditional update instead, which
   * does not need a read first and cannot lose a concurrent sale.
   */
  @Version private Long version;

  /** Recomputes {@link #status} from the current stock and reorder level. */
  public void refreshStatus() {
    this.status = StockStatus.of(this.stock, this.reorderLevel);
  }
}
