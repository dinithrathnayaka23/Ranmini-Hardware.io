package lk.ranminihardware.pos.sales.repository;

import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

/**
 * Sale persistence.
 *
 * Every finder here is backed by an index declared in MongoIndexInitializer.
 * This is the collection that grows without limit, so an unindexed query added
 * here would be invisible in testing and crippling after a year of trading.
 */
public interface SaleRepository extends MongoRepository<Sale, String> {

  Optional<Sale> findByInvoiceNumber(String invoiceNumber);

  /** Answers a retried checkout with the sale the first attempt created. */
  Optional<Sale> findByIdempotencyKey(String idempotencyKey);

  Page<Sale> findByStatusOrderBySoldAtDesc(SaleStatus status, Pageable pageable);

  /**
   * Sales within an inclusive date range.
   *
   * <p>Written as an explicit query rather than a derived {@code Between},
   * because Spring Data translates that keyword to {@code $gt}/{@code $lt} —
   * exclusive at BOTH ends. On dates that quietly drops the first and last day
   * of every range, which showed up here as a sales list that was empty on the
   * very day the sales were made.
   */
  @Query("{ 'businessDate': { $gte: ?0, $lte: ?1 } }")
  Page<Sale> findInDateRange(String fromIsoDate, String toIsoDate, Pageable pageable);

  /** Shift reconciliation: what one cashier took on one day. */
  List<Sale> findByCashierIdAndBusinessDate(String cashierId, String isoBusinessDate);
}
