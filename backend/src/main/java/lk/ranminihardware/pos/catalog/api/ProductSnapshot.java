package lk.ranminihardware.pos.catalog.api;

import java.math.BigDecimal;
import lk.ranminihardware.pos.catalog.domain.StockStatus;

/**
 * A product as other modules see it.
 *
 * Carries only what a till needs to sell the thing. In particular there is no
 * buying price here: what the shop paid is not the cashier's business, and the
 * surest way to keep a margin off a customer-facing screen is for it never to
 * reach the module that renders one.
 *
 * @param stock units on hand at the moment of the read; advisory only, since a
 *     concurrent sale can change it a millisecond later. The authority on
 *     whether stock exists is the conditional decrement, never this number.
 */
public record ProductSnapshot(
    String id,
    String sku,
    String name,
    String categoryId,
    String categoryName,
    BigDecimal sellingPrice,
    int stock,
    String unit,
    /** The point at which the shop reorders this line. */
    int reorderLevel) {

  /**
   * Whether this sale is what brought the line to the point of reordering.
   *
   * <p>A <em>transition</em>, not a state, and that is the whole value of it.
   * The till warns a cashier the moment a sale takes a product to or below its
   * reorder level, or empties the shelf — which is the one moment the warning
   * is news and the one moment somebody is standing there to act on it. Asking
   * "is this line low" instead would fire on every subsequent sale of an
   * already-low product, and a warning that appears on every transaction is one
   * a cashier learns to tap past without reading.
   *
   * <p>The before-state is reconstructed rather than read: this snapshot is the
   * product as it stands <em>after</em> the decrement, so the stock before the
   * sale is simply what is left plus what was sold. That avoids a second read,
   * and more importantly avoids a read that could race the very sale it is
   * describing.
   *
   * <p>{@link StockStatus#of} decides both ends of the comparison, so the rule
   * for "low" lives in exactly one place and this cannot drift from what the
   * inventory screen shows.
   *
   * @param quantitySold units this sale took off the shelf
   */
  public boolean reachedReorderLevelBySelling(int quantitySold) {
    StockStatus now = StockStatus.of(stock, reorderLevel);
    if (now == StockStatus.IN_STOCK) return false;

    // Selling nothing cannot cross anything; guarded so a zero-quantity caller
    // cannot report a line as newly low on every single sale.
    if (quantitySold <= 0) return false;

    return StockStatus.of(stock + quantitySold, reorderLevel) != now;
  }

  /** Nothing left on the shelf. */
  public boolean soldOut() {
    return StockStatus.of(stock, reorderLevel) == StockStatus.OUT_OF_STOCK;
  }
}
