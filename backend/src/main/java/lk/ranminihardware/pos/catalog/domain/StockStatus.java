package lk.ranminihardware.pos.catalog.domain;

/**
 * Stock state of a product line.
 *
 * <p>Derived from the stock on hand and the product's own reorder level, but
 * <b>stored</b> rather than computed at read time. That is a deliberate trade:
 * a stored field can be indexed, so "how many products are low on stock" is an
 * index count over a handful of documents instead of a scan that reads every
 * product in the catalogue to evaluate a comparison. It is recomputed on every
 * write that touches stock, in one place, so it cannot drift.
 *
 * <p>The names match the frontend's {@code StockStatus} union exactly, so no
 * translation layer is needed on either side.
 */
public enum StockStatus {
  IN_STOCK,
  LOW_STOCK,
  OUT_OF_STOCK;

  /**
   * The single place this is decided.
   *
   * @param stock units on hand
   * @param reorderLevel the point at which the shop should reorder; a product
   *     at or below this is "low" but still sellable
   */
  public static StockStatus of(int stock, int reorderLevel) {
    if (stock <= 0) return OUT_OF_STOCK;
    if (stock <= reorderLevel) return LOW_STOCK;
    return IN_STOCK;
  }
}
