package lk.ranminihardware.pos.catalog.web;

import jakarta.validation.Valid;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Set;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import lk.ranminihardware.pos.auth.service.JwtService.AuthenticatedUser;
import lk.ranminihardware.pos.catalog.service.InventoryPdfService;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import org.springframework.web.multipart.MultipartFile;

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
  private final InventoryPdfService inventoryPdf;
  private final PageQuery pageQuery;
  private final Clock clock;

  public ProductController(
      ProductService products,
      InventoryPdfService inventoryPdf,
      PageQuery pageQuery,
      Clock clock) {
    this.products = products;
    this.inventoryPdf = inventoryPdf;
    this.pageQuery = pageQuery;
    this.clock = clock;
  }

  /**
   * Who to print on an exported document.
   *
   * <p>Read from the verified token rather than a parameter. A report that named
   * whoever asked it to would be worthless as a record of who ran it.
   */
  private static String displayName(Authentication authentication) {
    if (authentication != null
        && authentication.getPrincipal() instanceof AuthenticatedUser user) {
      return user.fullName();
    }
    return authentication == null ? "" : authentication.getName();
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
    return ProductDtos.Response.from(products.adjustStock(id, adjustment.delta(), adjustment.reason()));
  }

  /**
   * The catalogue as a printable stock sheet.
   *
   * <p>Takes the same filters as the listing above, so the export is what the
   * person was looking at rather than a different report with the same name. It
   * is deliberately not paged: the point of this endpoint is that it covers
   * everything the filters describe, which is exactly what the browser-side CSV
   * export it replaced could not do.
   *
   * <p>The response is a file rather than JSON, so it carries a filename with
   * the date in it — a folder of downloads called "export.pdf" is a folder
   * nobody can navigate.
   */
  @GetMapping(value = "/export", produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<byte[]> export(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String categoryId,
      @RequestParam(required = false) StockStatus status,
      @RequestParam(required = false, defaultValue = "true") boolean activeOnly,
      Authentication authentication) {

    byte[] pdf =
        inventoryPdf.render(
            new ProductSearchCriteria(q, categoryId, status, activeOnly),
            displayName(authentication));

    String filename = "inventory-%s.pdf".formatted(LocalDate.now(clock));

    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(filename).build().toString())
        // Stock figures move constantly, and a cached stock sheet is a wrong
        // stock sheet — the one document where that matters most.
        .header(HttpHeaders.CACHE_CONTROL, "no-store")
        .body(pdf);
  }

  /**
   * Uploads or replaces a product's photograph.
   *
   * <p>Multipart rather than a JSON field, and bytes rather than a path. The
   * service validates the type against an allowlist and checks the magic number
   * before storing anything — the endpoint decides what the API will serve back,
   * so it cannot serve back whatever it was handed.
   *
   * <p>Two requests rather than one on the create screen: the product is created
   * first, then the picture is attached to its id. A single multipart request
   * carrying both would have to invent an id before validating the product, and
   * would leave an orphaned image behind whenever the product was rejected.
   */
  @PostMapping(value = "/products/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ProductDtos.Response uploadImage(
      @PathVariable String id, @RequestParam("file") MultipartFile file) {

    if (file == null || file.isEmpty()) {
      throw ApiException.badRequest("EMPTY_IMAGE", "Choose a picture to upload.");
    }

    try {
      return ProductDtos.Response.from(
          products.setImage(id, file.getBytes(), file.getContentType()));
    } catch (IOException ex) {
      throw ApiException.badRequest("UNREADABLE_IMAGE", "That file could not be read.");
    }
  }

  @DeleteMapping("/products/{id}/image")
  public ProductDtos.Response removeImage(@PathVariable String id) {
    return ProductDtos.Response.from(products.removeImage(id));
  }

  /**
   * A product's photograph.
   *
   * <p>404 rather than a placeholder when there is none: an absent picture is an
   * ordinary state, and the client renders its own neutral tile for it. Sending
   * back a stand-in image would make "no photograph" indistinguishable from a
   * photograph of a grey box.
   */
  @GetMapping("/products/{id}/image")
  public ResponseEntity<byte[]> image(@PathVariable String id) {
    return products
        .findImage(id)
        .map(
            image ->
                ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(image.getContentType()))
                    // Immutable: the caller's URL carries the version stamp, so
                    // a replaced picture is a different address and this
                    // response can never go stale. Private because the
                    // catalogue is behind a sign-in.
                    .header("Cache-Control", "private, max-age=31536000, immutable")
                    // The bytes were signature-checked on upload; a browser that
                    // sniffed its own type would make that check pointless.
                    .header("X-Content-Type-Options", "nosniff")
                    .body(image.getData()))
        .orElseGet(() -> ResponseEntity.notFound().build());
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
