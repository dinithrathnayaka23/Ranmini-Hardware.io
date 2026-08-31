package lk.ranminihardware.pos.sales.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.SaleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

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

  Page<Sale> findByBusinessDateBetweenOrderBySoldAtDesc(
      LocalDate from, LocalDate to, Pageable pageable);

  /** Shift reconciliation: what one cashier took on one day. */
  List<Sale> findByCashierIdAndBusinessDate(String cashierId, LocalDate businessDate);
}
