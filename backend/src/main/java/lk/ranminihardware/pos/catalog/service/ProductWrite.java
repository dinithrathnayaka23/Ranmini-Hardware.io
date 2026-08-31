package lk.ranminihardware.pos.catalog.service;

import java.math.BigDecimal;

/**
 * The editable fields of a product, as the service understands them.
 *
 * <p>Separate from the web-layer request record on purpose. The controller's
 * DTO exists to be validated and deserialised from JSON and will grow HTTP
 * concerns over time; this one exists to express what a product edit means. The
 * boundary is what stops a future request field leaking into the domain
 * unnoticed.
 *
 * <p>Notably absent: current stock. Stock only ever moves through a recorded,
 * atomic adjustment — a plain edit that set it would silently overwrite a sale
 * that landed a moment earlier.
 */
public record ProductWrite(
    String sku,
    String name,
    String brand,
    String categoryId,
    String unit,
    BigDecimal buyingPrice,
    BigDecimal sellingPrice,
    int openingStock,
    int reorderLevel,
    String imageUrl) {

  /**
   * Returns a copy carrying a product photograph.
   *
   * <p>A small convenience for building catalogue fixtures, where most fields
   * are the same shape and only some products have a picture on file.
   */
  public ProductWrite withImage(String url) {
    return new ProductWrite(
        sku, name, brand, categoryId, unit, buyingPrice, sellingPrice, openingStock,
        reorderLevel, url);
  }
}
