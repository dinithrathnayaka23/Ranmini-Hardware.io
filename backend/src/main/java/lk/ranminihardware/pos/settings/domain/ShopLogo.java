package lk.ranminihardware.pos.settings.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * The shop's logo, stored as bytes.
 *
 * <p><b>Its own collection rather than a field on {@link ShopSettings}</b>, for
 * the same reason a product's photograph is not a field on the product. The
 * settings document is read on every checkout, every till load and every page
 * of the portal; embedding a few hundred kilobytes of image in it would put
 * that image on the wire for all of them, and would defeat the cache that makes
 * reading settings on every sale cheap.
 *
 * <p>The settings document keeps only {@code logoUpdatedAt}, which is small,
 * answers "is there a logo" without a second read, and doubles as the
 * cache-busting token in the image URL.
 *
 * <p>One shop, one logo, so the id is fixed and replacing it is an upsert
 * rather than a delete-and-insert that could leave two behind.
 */
@Document(collection = "shop_logo")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopLogo {

  /** There is one shop, so there is one logo. */
  public static final String SINGLETON_ID = "shop";

  @Id @Builder.Default private String id = SINGLETON_ID;

  /**
   * The image's media type, from the closed allowlist in {@code ImageBytes}.
   *
   * <p>Stored rather than sniffed at read time because it is what the response
   * is served with, and a type decided per-request could drift from the bytes
   * it describes.
   */
  private String contentType;

  private byte[] data;

  /** Matches {@code ShopSettings.logoUpdatedAt}; the two are written together. */
  private Instant updatedAt;
}
