package lk.ranminihardware.pos.catalog.api;

/**
 * Why stock moved.
 *
 * Declared in the published api package rather than beside the document,
 * because other modules must name a reason when they move stock and should not
 * have to import a persistence class to do it. Kept coarse on purpose: finer
 * detail belongs in the free-text note on the movement itself.
 */
public enum StockChangeReason {
  SALE,
  SALE_VOIDED,
  DELIVERY,
  ADJUSTMENT,
  OPENING_BALANCE
}
