package lk.ranminihardware.pos.catalog.web;

import jakarta.validation.Valid;
import java.util.Set;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Inventory management — the admin side of the catalogue.
 *
 * <p>Separate from {@code PosCatalogController} even though both read products,
 * because they are different contracts for different audiences: this one exposes
 * cost prices and write operations, the till's does neither.
 */
@RestController
@RequestMapping("/api/v1/inventory")
public class ProductController {

  /**
   * Fields a client may sort by.
   *
   * <p>A whitelist, not a convenience. Sorting on an unindexed field makes Mongo
   * pull the whole result set into memory and fail past 32MB, so an open
   * {@code ?sort=} is a denial-of-service waiting to be typed. Every name here
   * is backed by an index in {@code MongoIndexInitializer}.
   */
  private static final Set<String> SORTABLE =
      Set.of("name", "sku", "stock", "sellingPrice", "updatedAt");

  private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.ASC, "name");

  private final ProductService products;
  private final PageQuery pageQuery;

  public ProductController(ProductService products, PageQuery pageQuery) {
    this.products = products;
    this.pageQuery = pageQuery;
  }

  @GetMapping("/products")
  public PageResponse<ProductDtos.Response> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String categoryId,
      @RequestParam(required = false) StockStatus status,
      @RequestParam(required = false, defaultValue = "true") boolean activeOnly,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String sort) {

    Pageable pageable = pageQuery.build(page, size, sort, SORTABLE, DEFAULT_SORT);
    Page<Product> results =
        products.search(new ProductSearchCriteria(q, categoryId, status, activeOnly), pageable);

    return PageResponse.from(results, ProductDtos.Response::from);
  }

  @GetMapping("/products/{id}")
  public ProductDtos.Response get(@PathVariable String id) {
    return ProductDtos.Response.from(products.get(id));
  }

  /** Barcode lookup, for the scanner path and for shelf-label checks. */
  @GetMapping("/products/by-sku/{sku}")
  public ProductDtos.Response getBySku(@PathVariable String sku) {
    return ProductDtos.Response.from(products.getBySku(sku));
  }

  @PostMapping("/products")
  @ResponseStatus(HttpStatus.CREATED)
  public ProductDtos.Response create(@Valid @RequestBody ProductDtos.Request request) {
    return ProductDtos.Response.from(products.create(request.toWrite()));
  }

  @PutMapping("/products/{id}")
  public ProductDtos.Response update(
      @PathVariable String id, @Valid @RequestBody ProductDtos.Request request) {
    return ProductDtos.Response.from(products.update(id, request.toWrite()));
  }

  /**
   * Deactivates rather than deletes.
   *
   * <p>Mapped to DELETE because that is what the client means, but nothing is
   * removed: last year's sales reference this document, and a receipt that
   * cannot name what was sold is worthless to the shop and to an auditor.
   */
  @DeleteMapping("/products/{id}")
  public ProductDtos.Response deactivate(@PathVariable String id) {
    return ProductDtos.Response.from(products.deactivate(id));
  }

  @PostMapping("/products/{id}/reactivate")
  public ProductDtos.Response reactivate(@PathVariable String id) {
    return ProductDtos.Response.from(products.reactivate(id));
  }

  /** A delivery, a stocktake correction, or breakage. */
  @PostMapping("/products/{id}/stock")
  public ProductDtos.Response adjustStock(
      @PathVariable String id, @Valid @RequestBody ProductDtos.StockAdjustment adjustment) {
    return ProductDtos.Response.from(products.adjustStock(id, adjustment.delta()));
  }

  @GetMapping("/summary")
  public ResponseEntity<ProductDtos.Summary> summary() {
    InventorySummary summary = products.summarise();

    return ResponseEntity.ok()
        // The figures are aggregates over the whole catalogue and are expensive
        // relative to how fast they change, so a short shared cache window keeps
        // a dashboard refresh from re-running the pipeline every few seconds.
        .header("Cache-Control", "private, max-age=30")
        .body(
            new ProductDtos.Summary(
                summary.totalProducts(),
                summary.lowStockItems(),
                summary.outOfStockItems(),
                summary.retailValue(),
                summary.costValue()));
  }
}
