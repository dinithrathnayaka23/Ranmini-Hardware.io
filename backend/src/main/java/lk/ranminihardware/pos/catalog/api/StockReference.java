package lk.ranminihardware.pos.catalog.api;

/**
 * Why a stock movement happened and what caused it.
 *
 * Required on every movement rather than optional. An unexplained change to
 * stock is exactly the entry nobody can account for when the shelf and the
 * screen disagree, and making the caller name a reason is cheaper than
 * reconstructing one later.
 *
 * @param reason the coarse category, used for reporting
 * @param referenceId the sale, delivery or adjustment that caused it
 * @param note optional free text, e.g. "damaged in transit"
 */
public record StockReference(StockChangeReason reason, String referenceId, String note) {

  public static StockReference forSale(String saleId) {
    return new StockReference(StockChangeReason.SALE, saleId, null);
  }

  public static StockReference forVoid(String saleId) {
    return new StockReference(StockChangeReason.SALE_VOIDED, saleId, null);
  }

  public static StockReference adjustment(String note) {
    return new StockReference(StockChangeReason.ADJUSTMENT, null, note);
  }
}
