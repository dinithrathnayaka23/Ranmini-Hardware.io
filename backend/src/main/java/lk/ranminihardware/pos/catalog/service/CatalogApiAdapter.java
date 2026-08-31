package lk.ranminihardware.pos.catalog.service;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.api.CatalogApi;
import lk.ranminihardware.pos.catalog.api.ProductSnapshot;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import org.springframework.stereotype.Service;

/**
 * The catalogue's side of the module boundary.
 *
 * Thin on purpose: it exists to convert documents into snapshots so no other
 * module ever holds a {@link Product}. Business rules stay in
 * {@link ProductService}; this only translates.
 */
@Service
public class CatalogApiAdapter implements CatalogApi {

  private final ProductRepository products;

  public CatalogApiAdapter(ProductRepository products) {
    this.products = products;
  }

  @Override
  public List<ProductSnapshot> findSellable(Collection<String> productIds) {
    if (productIds == null || productIds.isEmpty()) return List.of();
    return products.findByIdInAndActiveIsTrue(productIds).stream().map(CatalogApiAdapter::toSnapshot).toList();
  }

  @Override
  public Optional<ProductSnapshot> reserveStock(String productId, int quantity) {
    return products.decrementStock(productId, quantity).map(CatalogApiAdapter::toSnapshot);
  }

  @Override
  public void releaseStock(String productId, int quantity) {
    products.incrementStock(productId, quantity);
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
        product.getUnit());
  }
}
