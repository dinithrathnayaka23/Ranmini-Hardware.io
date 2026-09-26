package lk.ranminihardware.pos.catalog.repository.dto;

import java.math.BigDecimal;

/**
 * The fields an import can change, as currently stored — read so an import can
 * tell which rows actually differ, and write only those.
 */
public record ProductDetails(
    String name,
    String brand,
    String categoryId,
    String unit,
    BigDecimal buyingPrice,
    BigDecimal sellingPrice,
    int reorderLevel) {}
