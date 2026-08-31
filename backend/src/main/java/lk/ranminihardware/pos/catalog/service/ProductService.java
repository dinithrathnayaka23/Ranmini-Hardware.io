package lk.ranminihardware.pos.catalog.service;

import java.util.List;
import lk.ranminihardware.pos.catalog.api.StockReference;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.money.Money;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Product rules.
 *
 * <p>Stock is the one thing this class does <em>not</em> change directly: every
 * movement goes through the repository's conditional update so it stays atomic.
 * What lives here is everything a human edit needs — pricing sanity, keeping the
 * denormalised category name true, and refusing to delete history.
 */
@Service
public class ProductService {

  private final ProductRepository products;
  private final CategoryService categories;
  private final CatalogApiAdapter stock;

  public ProductService(
      ProductRepository products, CategoryService categories, CatalogApiAdapter stock) {
    this.products = products;
    this.categories = categories;
    this.stock = stock;
  }

  public Page<Product> search(ProductSearchCriteria criteria, Pageable pageable) {
    return products.search(criteria, pageable);
  }

  public Product get(String id) {
    return products.findById(id).orElseThrow(() -> ApiException.notFound("Product", id));
  }

  public Product getBySku(String sku) {
    return products
        .findBySkuIgnoreCase(sku)
        .orElseThrow(() -> ApiException.notFound("Product with SKU", sku));
  }

  public InventorySummary summarise() {
    return products.summarise();
  }

  /** The dashboard's low-stock panel: the most urgent lines, capped. */
  public List<Product> lowStock(int limit) {
    return products.findByStatusInAndActiveIsTrueOrderByStockAsc(
        List.of(StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK),
        PageRequest.of(0, Math.clamp(limit, 1, 50)));
  }

  public Product create(ProductWrite write) {
    String sku = write.sku().trim().toUpperCase();

    // Checked for a readable message; the unique index is the real guarantee.
    if (products.existsBySkuIgnoreCase(sku)) {
      throw ApiException.conflict("SKU_EXISTS", "A product with SKU %s already exists.".formatted(sku));
    }

    Category category = categories.get(write.categoryId());
    validatePricing(write);

    Product product =
        Product.builder()
            .sku(sku)
            .name(write.name().trim())
            .brand(trimToNull(write.brand()))
            .categoryId(category.getId())
            .categoryName(category.getName())
            .unit(write.unit() == null ? "pcs" : write.unit().trim())
            .buyingPrice(Money.of(write.buyingPrice()))
            .sellingPrice(Money.of(write.sellingPrice()))
            .stock(write.openingStock())
            .reorderLevel(write.reorderLevel())
            .imageUrl(trimToNull(write.imageUrl()))
            .active(true)
            .build();

    product.refreshStatus();
    return products.save(product);
  }

  /**
   * Updates the editable fields of a product.
   *
   * <p>Stock is not among them. Correcting stock is a movement with a reason —
   * a delivery, a stocktake, breakage — and letting it be set by a plain edit
   * would silently overwrite a sale that landed a moment earlier.
   */
  public Product update(String id, ProductWrite write) {
    Product product = get(id);
    validatePricing(write);

    if (!product.getCategoryId().equals(write.categoryId())) {
      Category category = categories.get(write.categoryId());
      product.setCategoryId(category.getId());
      product.setCategoryName(category.getName());
    }

    product.setName(write.name().trim());
    product.setBrand(trimToNull(write.brand()));
    product.setUnit(write.unit() == null ? product.getUnit() : write.unit().trim());
    product.setBuyingPrice(Money.of(write.buyingPrice()));
    product.setSellingPrice(Money.of(write.sellingPrice()));
    product.setImageUrl(trimToNull(write.imageUrl()));

    // The reorder level moves the low/in-stock boundary, so the stored status
    // has to be recomputed even though the stock itself did not change.
    product.setReorderLevel(write.reorderLevel());
    product.refreshStatus();

    return products.save(product);
  }

  /**
   * Deactivates a product so it disappears from the till but stays in history.
   *
   * <p>Hard deletion is never offered. A sale from last year references this
   * document, and a receipt that cannot say what was sold is useless to the shop
   * and to an auditor alike.
   */
  public Product deactivate(String id) {
    Product product = get(id);
    product.setActive(false);
    return products.save(product);
  }

  public Product reactivate(String id) {
    Product product = get(id);
    product.setActive(true);
    product.refreshStatus();
    return products.save(product);
  }

  /**
   * Records a deliberate stock movement — a delivery, a stocktake correction, or
   * breakage.
   *
   * <p>Routed through the same atomic primitive the till uses, so an adjustment
   * landing at the same moment as a sale cannot lose one of them.
   */
  public Product adjustStock(String id, int delta, String reason) {
    if (delta == 0) return get(id);

    // Routed through the catalogue API so the ledger entry is written by the
    // same code path the till uses. An adjustment that left no trace would be
    // the one entry nobody can account for at stocktake.
    StockReference reference = StockReference.adjustment(reason);

    if (delta > 0) {
      stock.releaseStock(id, delta, reference);
    } else if (stock.reserveStock(id, -delta, reference).isEmpty()) {
      throw ApiException.unprocessable(
          "INSUFFICIENT_STOCK", "That adjustment would take the stock below zero.");
    }

    return get(id);
  }

  /**
   * Selling below cost is allowed — clearance is a real thing a shop does — but
   * a negative price never is, and neither is a missing one.
   */
  private void validatePricing(ProductWrite write) {
    if (Money.isNegative(write.buyingPrice()) || Money.isNegative(write.sellingPrice())) {
      throw ApiException.badRequest("INVALID_PRICE", "Prices cannot be negative.");
    }
  }

  private static String trimToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
