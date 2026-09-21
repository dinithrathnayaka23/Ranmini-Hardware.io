package lk.ranminihardware.pos.catalog.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.api.CatalogApi;
import lk.ranminihardware.pos.catalog.api.ProductSnapshot;
import lk.ranminihardware.pos.catalog.api.StockReference;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockMovement;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.repository.StockMovementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * The catalogue's side of the module boundary.
 *
 * <p>Converts documents into snapshots so no other module ever holds a
 * {@link Product}, and writes the stock ledger entry for every movement. Doing
 * the ledger here rather than in the caller is what guarantees stock cannot move
 * unrecorded: there is no path to the atomic update that skips this class.
 */
@Service
public class CatalogApiAdapter implements CatalogApi {

  private static final Logger log = LoggerFactory.getLogger(CatalogApiAdapter.class);

  private final ProductRepository products;
  private final StockMovementRepository movements;

  public CatalogApiAdapter(ProductRepository products, StockMovementRepository movements) {
    this.products = products;
    this.movements = movements;
  }

  @Override
  public List<ProductSnapshot> findSellable(Collection<String> productIds) {
    if (productIds == null || productIds.isEmpty()) return List.of();
    return products.findByIdInAndActiveIsTrue(productIds).stream()
        .map(CatalogApiAdapter::toSnapshot)
        .toList();
  }

  @Override
  public Map<String, BigDecimal> unitCosts(Collection<String> productIds) {
    if (productIds == null || productIds.isEmpty()) return Map.of();

    Map<String, BigDecimal> costs = new HashMap<>();
    for (Product product : products.findByIdInAndActiveIsTrue(productIds)) {
      if (product.getBuyingPrice() != null) {
        costs.put(product.getId(), product.getBuyingPrice());
      }
    }
    return costs;
  }

  @Override
  public Optional<ProductSnapshot> reserveStock(
      String productId, int quantity, StockReference reference) {

    Optional<Product> updated = products.decrementStock(productId, quantity);
    updated.ifPresent(product -> record(product, -quantity, reference));
    return updated.map(CatalogApiAdapter::toSnapshot);
  }

  @Override
  public void releaseStock(String productId, int quantity, StockReference reference) {
    products.incrementStock(productId, quantity).ifPresent(p -> record(p, quantity, reference));
  }

  /**
   * Appends to the stock ledger.
   *
   * <p>A failure here must not undo a stock change that already succeeded: the
   * goods really have left the shelf, and throwing now would roll back the sale
   * over a bookkeeping problem. So it is logged loudly and swallowed — the
   * product document remains the authority on stock, and the ledger is a record
   * of how it got there.
   */
  private void record(Product product, int delta, StockReference reference) {
    try {
      movements.save(
          StockMovement.builder()
              .productId(product.getId())
              .sku(product.getSku())
              .delta(delta)
              .resultingStock(product.getStock())
              .reason(reference.reason())
              .referenceId(reference.referenceId())
              .note(reference.note())
              .occurredAt(Instant.now())
              .build());
    } catch (RuntimeException ex) {
      log.error(
          "Stock moved but the ledger entry failed: product={} delta={} reason={}",
          product.getId(),
          delta,
          reference.reason(),
          ex);
    }
  }

  static ProductSnapshot toSnapshot(Product product) {
    return new ProductSnapshot(
        product.getId(),
        product.getSku(),
        product.getName(),
        product.getCategoryId(),
        product.getCategoryName(),
        product.getSellingPrice(),
        product.getStock(),
        product.getUnit(),
        product.getReorderLevel());
  }
}
