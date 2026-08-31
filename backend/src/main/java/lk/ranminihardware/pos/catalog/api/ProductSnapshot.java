package lk.ranminihardware.pos.catalog.api;

import java.math.BigDecimal;

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
    String unit) {}
