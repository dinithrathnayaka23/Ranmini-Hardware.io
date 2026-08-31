package lk.ranminihardware.pos.catalog.api;

import java.util.Collection;
import java.util.List;
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
   * scanned, which is what makes a till feel slow on a large order.
   */
  List<ProductSnapshot> findSellable(Collection<String> productIds);

  /**
   * Takes stock off the shelf, atomically, and only if it is there.
   *
   * @return the product as it now stands, or empty when the sale cannot be
   *     honoured — insufficient stock, inactive, or missing.
   */
  Optional<ProductSnapshot> reserveStock(String productId, int quantity);

  /**
   * Puts stock back after a failed or voided sale.
   *
   * <p>Never refused: the goods are still physically on the shelf, so a system
   * that declined to record that would be the one telling the lie.
   */
  void releaseStock(String productId, int quantity);
}
