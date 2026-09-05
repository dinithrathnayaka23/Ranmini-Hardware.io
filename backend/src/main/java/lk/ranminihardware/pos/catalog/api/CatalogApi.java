package lk.ranminihardware.pos.catalog.api;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Everything another module is allowed to ask of the catalogue.
 *
 * <p>This is the module boundary. {@code sales} needs to price a basket and to
 * take stock off the shelf, but it must not reach into
 * {@code catalog.repository} or hold a {@code Product} document — otherwise the
 * two modules are welded together and the catalogue can never change shape
 * without breaking checkout.
 *
 * <p>Everything crossing this line is a record with only the fields the caller
 * genuinely needs. Note in particular that {@link ProductSnapshot} carries no
 * buying price: what the shop paid is nobody's business at the till.
 */
public interface CatalogApi {

  /**
   * Prices a basket in one round trip.
   *
   * <p>Deliberately batch. A lookup per line is a network round trip per item
   * rung up, which is what makes a till feel slow on a large order.
   */
  List<ProductSnapshot> findSellable(Collection<String> productIds);

  /**
   * What the shop paid per unit, for the products given.
   *
   * <p>Separate from {@link ProductSnapshot} on purpose. Sales genuinely needs
   * cost — profit has to be computed and frozen onto the receipt at the moment
   * of sale, or a later price change silently rewrites last month's margin. But
   * cost must never travel in a shape that a customer-facing response is built
   * from, so it is fetched deliberately, by a method whose name says what it is,
   * rather than riding along on the snapshot everything else uses.
   *
   * @return unit cost by product id; a product missing from the map has no
   *     recorded cost and should be treated as zero rather than blocking a sale
   */
  Map<String, BigDecimal> unitCosts(Collection<String> productIds);

  /**
   * Takes stock off the shelf, atomically, and only if it is there.
   *
   * <p>Every caller must say why, so the movement can be explained later. The
   * ledger entry is written here rather than by the caller, which is what
   * guarantees no stock ever moves unrecorded.
   *
   * @return the product as it now stands, or empty when the sale cannot be
   *     honoured — insufficient stock, inactive, or missing. The caller is not
   *     told which, because the answer to all three is the same.
   */
  Optional<ProductSnapshot> reserveStock(String productId, int quantity, StockReference reference);

  /**
   * Puts stock back after a failed or voided sale.
   *
   * <p>Never refused: the goods are still physically on the shelf, so a system
   * that declined to record that would be the one telling the lie.
   */
  void releaseStock(String productId, int quantity, StockReference reference);
}
