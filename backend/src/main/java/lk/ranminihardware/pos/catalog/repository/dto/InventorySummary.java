package lk.ranminihardware.pos.catalog.repository.dto;

import java.math.BigDecimal;

/**
 * The four figures on the inventory summary cards, produced by one aggregation.
 *
 * @param totalProducts active products in the catalogue
 * @param lowStockItems products at or below their reorder level but not yet out
 * @param outOfStockItems products with nothing on the shelf
 * @param retailValue stock on hand valued at the selling price
 * @param costValue stock on hand valued at what the shop paid, which is the
 *     figure that belongs in the accounts
 */
public record InventorySummary(
    long totalProducts,
    long lowStockItems,
    long outOfStockItems,
    BigDecimal retailValue,
    BigDecimal costValue) {

  public static InventorySummary empty() {
    return new InventorySummary(0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO);
  }
}
