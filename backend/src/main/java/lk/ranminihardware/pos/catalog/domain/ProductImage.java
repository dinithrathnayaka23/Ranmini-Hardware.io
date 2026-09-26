package lk.ranminihardware.pos.catalog.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A product's photograph, stored as bytes.
 *
 * <p><b>Its own collection rather than a field on {@link Product}</b>, for the
 * same reason staff photographs are: the product document is read constantly —
 * every till load, every page of the inventory table, every checkout line — and
 * embedding image bytes would ship a photograph across the wire on every one of
 * those reads. A hundred products with a 300KB picture each would turn a single
 * page of the catalogue into a 30MB response.
 *
 * <p>The product document keeps only {@code imageVersion}, which is small,
 * answers "is there a picture" without a second read, and doubles as the
 * cache-busting token in the image URL.
 *
 * <p>The id is the product id, so a product has exactly one picture and
 * replacing it is an upsert rather than a delete-and-insert that could leave two
 * behind.
 */
@Document(collection = "product_images")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductImage {

  /** The product's id. One picture per product, by construction. */
  @Id private String id;

  /**
   * The image's media type, from the closed allowlist in {@code ImageBytes}.
   *
   * <p>Stored rather than sniffed at read time because it is what the response
   * is served with, and a type decided per-request could drift from the bytes it
   * describes.
   */
  private String contentType;

  private byte[] data;

  /**
   * A small JPEG copy for product tiles, made when the picture is uploaded — or
   * the first time it is asked for, for pictures uploaded before thumbnails
   * existed. Null when the format cannot be scaled (WebP); the original is then
   * served in its place.
   */
  private byte[] thumbnail;

  private String thumbnailType;

  /** Matches {@code Product.imageVersion}; the two are written together. */
  private Instant updatedAt;
}
