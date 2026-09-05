package lk.ranminihardware.pos.catalog.repository;

import java.util.Optional;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.dto.InventorySummary;
import lk.ranminihardware.pos.catalog.repository.dto.ProductSearchCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Product queries that derived repository methods cannot express.
 *
 * Everything here exists because the generated equivalent would be either wrong
 * under concurrency or too slow at scale — each method says which.
 */
public interface ProductRepositoryCustom {

  /**
   * Takes {@code quantity} units off a product, atomically, and only if that
   * many are actually there.
   *
   * <p>This is the single most important operation in the service. The obvious
   * implementation — read the product, check the stock, write it back — has a
   * race between the read and the write, and two tills selling the last bag of
   * cement at the same moment both pass the check and both sell it. Here the
   * check and the decrement are one conditional update evaluated by the
   * database, so exactly one of them wins and the other is told there is no
   * stock.
   *
   * <p>The stored {@code status} is recomputed inside the same update using an
   * aggregation pipeline, so it can never disagree with the stock it describes.
   *
   * @return the product as it now stands, or empty when there was not enough
   *     stock (or the product is inactive or missing) — the caller cannot tell
   *     these apart on purpose, because the answer to all three is the same.
   */
  Optional<Product> decrementStock(String productId, int quantity);

  /**
   * Puts stock back — a voided sale, a return, or compensation for a checkout
   * that failed partway through.
   *
   * <p>Unconditional by design: putting stock back must never be refused, or a
   * failed checkout would leak inventory that the shop still physically has.
   */
  Optional<Product> incrementStock(String productId, int quantity);

  /**
   * The admin inventory table: text search, filters, and paging in one query.
   *
   * <p>Uses the text index rather than a regex. An unanchored {@code /term/}
   * cannot use an index at all, so it degrades to a full collection scan on
   * every keystroke — fine on the seed data, fatal on a real catalogue.
   */
  Page<Product> search(ProductSearchCriteria criteria, Pageable pageable);

  /**
   * The four figures on the inventory summary cards.
   *
   * <p>One aggregation rather than four count queries plus a sum computed in
   * Java. The totals never leave the database, so the service does not load the
   * catalogue into memory to add it up.
   */
  InventorySummary summarise();
}
