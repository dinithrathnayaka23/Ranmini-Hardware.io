package lk.ranminihardware.pos.catalog.repository.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * The descriptive fields of an existing product, as a bulk import sets them.
 *
 * <p>Deliberately no stock. Stock moves only through sales and recorded
 * adjustments, each of which leaves a line in the stock ledger; a spreadsheet
 * overwriting it would erase whatever sold between the export and the import,
 * with no record of the change.
 */
public record ProductDetailsUpdate(
    String sku,
    String name,
    String brand,
    String categoryId,
    String categoryName,
    String unit,
    BigDecimal buyingPrice,
    BigDecimal sellingPrice,
    int reorderLevel,
    List<String> searchKeys) {}
