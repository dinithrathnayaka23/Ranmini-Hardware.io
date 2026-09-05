package lk.ranminihardware.pos.catalog.web;

import java.util.Set;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import lk.ranminihardware.pos.catalog.service.ProductService;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
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
   * render. The frontend's search and category chips map onto the parameters
   * here, so filtering narrows the query rather than the rendered list.
   */
  @GetMapping("/products")
  public PageResponse<ProductDtos.PosProduct> products(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String categoryId,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String sort) {

    Pageable pageable = pageQuery.build(page, size, sort, SORTABLE, DEFAULT_SORT);

    // `sellable` pins activeOnly to true, so a deactivated product can never
    // reach the till regardless of what the client asks for.
    Page<Product> results =
        products.search(ProductSearchCriteria.sellable(q, categoryId), pageable);

    return PageResponse.from(results, ProductDtos.PosProduct::from);
  }
}
