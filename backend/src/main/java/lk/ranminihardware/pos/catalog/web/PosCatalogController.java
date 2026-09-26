package lk.ranminihardware.pos.catalog.web;

import java.util.Set;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.SliceResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The till's read-only view of the catalogue.
 *
 * <p>A separate controller from {@link ProductController} rather than a flag on
 * it. The two serve different audiences and the difference is a security
 * boundary, not a formatting one: nothing reachable here exposes a buying price
 * or writes anything. Keeping them apart means that stays true by construction
 * rather than by remembering to check a parameter.
 */
@RestController
@RequestMapping("/api/v1/pos")
public class PosCatalogController {

  private static final Set<String> SORTABLE = Set.of("name", "sellingPrice");
  private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.ASC, "name");

  private final ProductService products;
  private final PageQuery pageQuery;

  public PosCatalogController(ProductService products, PageQuery pageQuery) {
    this.products = products;
    this.pageQuery = pageQuery;
  }

  /**
   * The product grid.
   *
   * <p>Paged even though the till renders a wall of cards: a hardware shop's
   * catalogue is thousands of lines, and sending all of them to a counter
   * machine on every page load would be slow on the wire before it was slow to
   * render. The till's search box and category chips map onto the parameters
   * here, so filtering narrows the query rather than the rendered list.
   *
   * <p>Answers with a slice — the page and whether there is more — rather than a
   * page with a total. The till scrolls; it never shows "page 4 of 500", and
   * counting every match on every keystroke was the costliest part of a search.
   */
  @GetMapping("/products")
  public SliceResponse<ProductDtos.PosProduct> products(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String categoryId,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String sort) {

    Pageable pageable = pageQuery.build(page, size, sort, SORTABLE, DEFAULT_SORT);

    // `sellable` pins activeOnly to true, so a deactivated product can never
    // reach the till regardless of what the client asks for.
    return SliceResponse.from(
        products.searchSellable(q, categoryId, pageable), ProductDtos.PosProduct::from);
  }

  /**
   * One sellable product by its exact shelf code.
   *
   * <p>For the till's Enter key: a cashier who types a full SKU expects that
   * item, even when other codes start with the same characters and it would not
   * be first in an alphabetical list.
   */
  @GetMapping("/products/by-sku/{sku}")
  public ProductDtos.PosProduct bySku(@PathVariable String sku) {
    return products
        .findSellableBySku(sku)
        .map(ProductDtos.PosProduct::from)
        .orElseThrow(() -> ApiException.notFound("Product with SKU", sku));
  }
}
