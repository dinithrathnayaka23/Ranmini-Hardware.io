package lk.ranminihardware.pos.catalog.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.api.StockReference;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.ProductImage;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.ProductImageRepository;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.media.ImageBytes;
import lk.ranminihardware.pos.shared.media.Thumbnails;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.money.Money;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
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
  private final ProductImageRepository images;
  private final CategoryService categories;
  private final CatalogApiAdapter stock;
  private final SettingsService settings;
  private final InventorySummaryCache summary;
  private final Clock clock;

  public ProductService(
      ProductRepository products,
      ProductImageRepository images,
      CategoryService categories,
      CatalogApiAdapter stock,
      SettingsService settings,
      InventorySummaryCache summary,
      Clock clock) {
    this.products = products;
    this.images = images;
    this.categories = categories;
    this.stock = stock;
    this.settings = settings;
    this.summary = summary;
    this.clock = clock;
  }

  public Page<Product> search(ProductSearchCriteria criteria, Pageable pageable) {
    return products.search(criteria, pageable);
  }

  /** The till's catalogue: sellable products only, and no total. */
  public Slice<Product> searchSellable(String term, String categoryId, Pageable pageable) {
    return products.searchSlice(ProductSearchCriteria.sellable(term, categoryId), pageable);
  }

  /** A sellable product by its exact shelf code, for the till's Enter key. */
  public Optional<Product> findSellableBySku(String sku) {
    return products.findBySku(ProductRepository.normaliseSku(sku)).filter(Product::isActive);
  }

  public Product get(String id) {
    return products.findById(id).orElseThrow(() -> ApiException.notFound("Product", id));
  }

  public Product getBySku(String sku) {
    return products
        .findBySku(ProductRepository.normaliseSku(sku))
        .orElseThrow(() -> ApiException.notFound("Product with SKU", sku));
  }

  /** Catalogue totals, recounted at most every few seconds — see InventorySummaryCache. */
  public InventorySummary summarise() {
    return summary.get();
  }

  /** The dashboard's low-stock panel: the most urgent lines, capped. */
  public List<Product> lowStock(int limit) {
    return products.findByStatusInAndActiveIsTrueOrderByStockAsc(
        List.of(StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK),
        PageRequest.of(0, Math.clamp(limit, 1, 50)));
  }

  public Product create(ProductWrite write) {
    String sku = ProductRepository.normaliseSku(write.sku());

    // Checked for a readable message; the unique index is the real guarantee.
    if (products.existsBySku(sku)) {
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
    Product saved = products.save(product);
    summary.invalidate();
    return saved;
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

    // Only set when the write actually carries a path. The product endpoints
    // never send one — photographs are uploaded, not typed — so a null here
    // means "leave the bundled fixture image alone", not "clear the picture".
    if (write.imageUrl() != null) {
      product.setImageUrl(trimToNull(write.imageUrl()));
    }

    // The reorder level moves the low/in-stock boundary, so the stored status
    // has to be recomputed even though the stock itself did not change.
    product.setReorderLevel(write.reorderLevel());
    product.refreshStatus();

    Product saved = products.save(product);
    summary.invalidate();
    return saved;
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
    Product saved = products.save(product);
    summary.invalidate();
    return saved;
  }

  public Product reactivate(String id) {
    Product product = get(id);
    product.setActive(true);
    product.refreshStatus();
    Product saved = products.save(product);
    summary.invalidate();
    return saved;
  }

  /**
   * Records a deliberate stock movement — a delivery, a stocktake correction, or
   * breakage.
   *
   * <p>Routed through the same atomic primitive the till uses, so an adjustment
   * landing at the same moment as a sale cannot lose one of them.
   */
  public Product adjustStock(String id, int delta, String reason) {
    return adjustStock(id, delta, reason, null);
  }

  /**
   * Records a stock movement, optionally repricing the stock it adds.
   *
   * @param unitCost what the shop paid per unit on this delivery, or null when
   *     the movement is a correction rather than a purchase. Supplying it is
   *     what makes the weighted-average valuation in Settings → Business Logic
   *     mean something: see {@link #revalue}.
   */
  public Product adjustStock(String id, int delta, String reason, BigDecimal unitCost) {
    if (delta == 0) return get(id);

    // Read before the movement, because the weighted average needs the stock
    // and cost as they were before this delivery landed.
    Product before = get(id);

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

    if (delta > 0 && unitCost != null) {
      revalue(id, before, delta, unitCost);
    }

    summary.invalidate();
    return get(id);
  }

  /**
   * Moves a product's buying price to the weighted average of what is now on
   * the shelf.
   *
   * <p><b>This is what Settings → Business Logic → Stock Valuation now does.</b>
   * The setting was stored and never read, so a delivery at a new price left the
   * old cost in place and every margin and profit figure quietly drifted from
   * what the shop had actually paid.
   *
   * <p>The rule is the ordinary one: the stock already held keeps its cost, the
   * stock arriving carries its own, and the new cost is the total spend divided
   * by the total units.
   *
   * <pre>
   *   40 bags on hand at 1,900  +  60 bags delivered at 2,000
   *   = (40 x 1900 + 60 x 2000) / 100 = 1,960 per bag
   * </pre>
   *
   * <p>FIFO is deliberately not offered. It would mean storing a cost layer per
   * delivery and consuming layers in order on every sale — a real
   * inventory-accounting feature, and a much larger one than this. Weighted
   * average is also what a shop of this size actually keeps its books on.
   *
   * <p>Negative movements never revalue. Breakage and stocktake corrections
   * remove units at whatever they cost; they do not change the price of what is
   * left.
   */
  private void revalue(String id, Product before, int received, BigDecimal unitCost) {
    if (Money.isNegative(unitCost)) {
      throw ApiException.badRequest("INVALID_PRICE", "A delivery cost cannot be negative.");
    }
    if (!SettingsService.WEIGHTED_AVERAGE.equals(settings.stockValuation())) return;

    int heldBefore = Math.max(0, before.getStock());
    BigDecimal costBefore = Money.of(before.getBuyingPrice());

    BigDecimal valueBefore = Money.multiply(costBefore, heldBefore);
    BigDecimal valueReceived = Money.multiply(Money.of(unitCost), received);

    int total = heldBefore + received;
    if (total <= 0) return;

    // Rounded to the money scale like every other stored amount. The remainder
    // is a fraction of a cent per unit and would otherwise accumulate in the
    // product document for ever.
    BigDecimal average =
        Money.add(valueBefore, valueReceived)
            .divide(BigDecimal.valueOf(total), Money.SCALE, RoundingMode.HALF_UP);

    // Re-read rather than reusing `before`: the sale that landed while this
    // delivery was being recorded has already changed the document, and saving
    // the stale copy would undo it.
    Product current = get(id);
    current.setBuyingPrice(average);
    products.save(current);
  }

  /**
   * Stores or replaces a product's photograph.
   *
   * <p>The bytes are validated before anything is written — type allowlist and
   * magic number both — because this endpoint decides what the API will later
   * serve back, and an image endpoint that will serve whatever it was given is a
   * way to host a script on the API's own origin.
   *
   * <p>The version stamp on the product and the image document are written with
   * the same instant, so the URL the frontend builds always names the bytes that
   * are actually stored.
   */
  public Product setImage(String id, byte[] data, String contentType) {
    ImageBytes.validate(data, contentType, ImageBytes.MAX_PRODUCT_IMAGE_BYTES);

    Product product = get(id);
    Instant now = Instant.now(clock);

    // Made once here rather than on every request: a till page asks for sixty
    // of these at a time, and scaling is the expensive part.
    Optional<Thumbnails.Thumbnail> thumbnail = Thumbnails.of(data);

    images.save(
        ProductImage.builder()
            .id(product.getId())
            .contentType(ImageBytes.normaliseType(contentType))
            .data(data)
            .thumbnail(thumbnail.map(Thumbnails.Thumbnail::data).orElse(null))
            .thumbnailType(thumbnail.map(Thumbnails.Thumbnail::contentType).orElse(null))
            .updatedAt(now)
            .build());

    product.setImageVersion(now);
    return products.save(product);
  }

  /**
   * Removes the uploaded photograph, falling the product back to a plain tile.
   *
   * <p>The reference is cleared before the bytes are deleted: somebody who asked
   * for a picture to be gone should stop seeing it even if the second write
   * fails, and an orphaned image document is harmless where an orphaned
   * reference would render a broken tile at the counter.
   */
  public Product removeImage(String id) {
    Product product = get(id);

    product.setImageVersion(null);
    Product saved = products.save(product);

    images.deleteById(product.getId());
    return saved;
  }

  /** The stored photograph, for the endpoint that serves the bytes. */
  public Optional<ProductImage> findImage(String productId) {
    return images.findById(productId);
  }

  /**
   * The tile-sized copy of a product's picture: its bytes and type.
   *
   * <p>A picture uploaded before thumbnails existed gets one made on this first
   * request and saved, so older photographs catch up without a migration. When
   * none can be made (WebP), the original is returned instead.
   */
  public Optional<ImageBytes.Stored> findThumbnail(String productId) {
    Optional<ProductImage> light = images.findThumbnailById(productId);
    if (light.isEmpty()) return Optional.empty();

    ProductImage thumb = light.get();
    if (thumb.getThumbnail() != null) {
      return Optional.of(new ImageBytes.Stored(thumb.getThumbnail(), thumb.getThumbnailType()));
    }

    // No thumbnail yet — uploaded before they existed — or none possible (WebP).
    // Either way the original is needed now.
    return images
        .findById(productId)
        .map(
            image -> {
              if (image.getThumbnailType() == null) {
                Optional<Thumbnails.Thumbnail> made = Thumbnails.of(image.getData());
                image.setThumbnail(made.map(Thumbnails.Thumbnail::data).orElse(null));
                // Recorded even when none could be made, so a WebP is not
                // re-attempted on every request.
                image.setThumbnailType(made.map(Thumbnails.Thumbnail::contentType).orElse("none"));
                images.save(image);
              }
              return image.getThumbnail() != null
                  ? new ImageBytes.Stored(image.getThumbnail(), image.getThumbnailType())
                  : new ImageBytes.Stored(image.getData(), image.getContentType());
            });
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
