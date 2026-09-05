package lk.ranminihardware.pos.catalog.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.domain.StockStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

/**
 * Product persistence.
 *
 * Derived methods cover the straightforward lookups; anything that would be
 * unsafe under concurrency or slow at scale lives in
 * {@link ProductRepositoryCustom} with a note explaining why.
 */
public interface ProductRepository extends MongoRepository<Product, String>, ProductRepositoryCustom {

  /** Shelf-code lookup — served by the unique index on sku. */
  Optional<Product> findBySkuIgnoreCase(String sku);

  boolean existsBySkuIgnoreCase(String sku);

  /**
   * Loads several products by id in one round trip.
   *
   * Used by checkout to price a basket. The alternative — a findById per line —
   * is a network round trip per item rung up, which is what makes a till feel
   * slow on a large order.
   */
  List<Product> findByIdInAndActiveIsTrue(Collection<String> ids);

  /**
   * The dashboard's low-stock panel.
   *
   * Served by the compound index on status and stock, and returned in ascending
   * stock order so the most urgent line is first.
   */
  List<Product> findByStatusInAndActiveIsTrueOrderByStockAsc(
      Collection<StockStatus> statuses, Pageable pageable);

  long countByCategoryIdAndActiveIsTrue(String categoryId);

  /**
   * Projection for the category rename fan-out: ids only.
   *
   * Reading whole product documents to update one denormalised field would pull
   * the entire category into memory for nothing.
   */
  @Query(value = "{ 'categoryId': ?0 }", fields = "{ '_id': 1 }")
  List<Product> findIdsByCategoryId(String categoryId);
}
