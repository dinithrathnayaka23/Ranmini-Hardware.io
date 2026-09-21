package lk.ranminihardware.pos.sales.service;

/**
 * A warning the till shows the cashier immediately after a sale.
 *
 * <p>Produced only when the sale just completed <em>changed</em> a line's
 * availability — took it to or below its reorder level, or emptied the shelf.
 * It is not a report of everything in the basket that happens to be low: that
 * would put a warning on nearly every transaction in a shop that is short of
 * anything, and a warning a cashier sees on every sale is one they stop
 * reading.
 *
 * <p>This exists because of who is standing where. The owner learns about stock
 * from the portal, hours later and away from the counter. The cashier is the
 * person holding the second-to-last bag of cement, in front of the customer who
 * may want the last one, and the moment they can usefully be told is now.
 *
 * @param sku what the shop calls the line out loud, and what a cashier would
 *     quote to the owner
 * @param remaining units left after this sale
 * @param reorderLevel the level the shop reorders at, so the message can say
 *     what the number means rather than just stating it
 * @param soldOut true when there is nothing left at all, which is a different
 *     message and a different colour from "running low"
 */
public record StockNotice(
    String productId,
    String sku,
    String name,
    String unit,
    int remaining,
    int reorderLevel,
    boolean soldOut) {}
