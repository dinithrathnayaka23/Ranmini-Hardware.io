package lk.ranminihardware.pos.catalog.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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

  /** Shop-facing code, as printed on the shelf label. Unique. */
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

  /**
   * Path to a photograph bundled with the frontend, or null.
   *
   * <p>This is the fallback, not the main route. Pictures the shop uploads live
   * in {@code product_images} and are pointed at by {@link #imageVersion}; this
   * field exists for catalogue fixtures that reference an image already shipped
   * under the frontend's {@code public/} directory, and it is never written
   * through the product endpoints.
   */
  private String imageUrl;

  /**
   * When the uploaded photograph last changed, or null when there is none.
   *
   * <p>Kept on the product — rather than asking the image collection whether a
   * document exists — so a page of the catalogue can tell which products have a
   * picture without reading a single byte of image data. It doubles as the
   * cache-busting token in the image URL, which is what lets that URL be cached
   * immutably: a new picture is a new address.
   *
   * <p>An uploaded picture takes precedence over {@link #imageUrl}. A shopkeeper
   * who photographs a product has plainly said which image they want.
   */
  private Instant imageVersion;

  /**
   * Products are deactivated, never deleted.
   *
   * <p>A sale from last year references this document, and a receipt that
   * cannot name what was sold is worthless — to the shop and to an auditor.
   */
  @Builder.Default private boolean active = true;

  /**
   * The lower-cased words of the name, brand and SKU, for type-ahead search.
   *
   * <p>Derived, never edited: {@link SearchKeysOnSave} recomputes it on every
   * save, so no write path can leave it out of step with the name. See
   * {@link SearchKeys} for why this exists instead of a text index.
   */
  private List<String> searchKeys;

  @CreatedDate private Instant createdAt;

  @LastModifiedDate private Instant updatedAt;

  /**
   * Guards against two admins editing the same product concurrently. Stock
   * changes do not rely on this — they use a conditional update instead, which
   * does not need a read first and cannot lose a concurrent sale.
   */
  @Version private Long version;

  /** Recomputes {@link #status} from the current stock and reorder level. */
  /** Recomputes {@link #searchKeys} from the current name, brand and SKU. */
  public void refreshSearchKeys() {
    this.searchKeys = SearchKeys.forProduct(this.name, this.brand, this.sku);
  }

  public void refreshStatus() {
    this.status = StockStatus.of(this.stock, this.reorderLevel);
  }
}
