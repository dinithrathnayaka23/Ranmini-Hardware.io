package lk.ranminihardware.pos.catalog.repository;

import java.util.List;
import lk.ranminihardware.pos.catalog.domain.StockMovement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * The stock ledger.
 *
 * Append-only: nothing here updates or deletes a movement, because an audit
 * trail that can be edited is not one. Old entries leave via the TTL index
 * rather than through code.
 */
public interface StockMovementRepository extends MongoRepository<StockMovement, String> {

  /** One product history, newest first — served by the compound index. */
  List<StockMovement> findByProductIdOrderByOccurredAtDesc(String productId, Pageable pageable);

  List<StockMovement> findByReferenceId(String referenceId);
}
