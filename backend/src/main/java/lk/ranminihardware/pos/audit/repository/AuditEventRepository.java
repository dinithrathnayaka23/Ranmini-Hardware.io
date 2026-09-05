package lk.ranminihardware.pos.audit.repository;

import lk.ranminihardware.pos.audit.domain.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Audit persistence.
 *
 * <p>One finder, walking the log backwards, backed by the index declared in
 * {@code MongoIndexInitializer}. This collection only ever grows, so an
 * unindexed query added here would be invisible on a week of data and crippling
 * after a year.
 *
 * <p><b>No delete, and no update.</b> Spring Data gives the interface some for
 * free through {@code MongoRepository}, but nothing in this service calls them
 * and no endpoint exposes them. Old entries leave by the TTL index instead,
 * which is a rule rather than somebody's decision.
 */
public interface AuditEventRepository extends MongoRepository<AuditEvent, String> {

  Page<AuditEvent> findAllByOrderByOccurredAtDesc(Pageable pageable);
}
