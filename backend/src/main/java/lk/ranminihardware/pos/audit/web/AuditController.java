package lk.ranminihardware.pos.audit.web;

import java.time.Instant;
import java.util.Set;
import lk.ranminihardware.pos.audit.domain.AuditAction;
import lk.ranminihardware.pos.audit.domain.AuditEvent;
import lk.ranminihardware.pos.audit.service.AuditService;
import lk.ranminihardware.pos.shared.web.PageQuery;
import lk.ranminihardware.pos.shared.web.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reading the audit log.
 *
 * <p>Read-only, and there is no write endpoint on purpose. Entries are made by
 * the services that perform the actions, from the verified token; an endpoint
 * that accepted an entry would let a client write history.
 *
 * <p>Administrator-only, which is the point — the log exists so the owner can
 * see what was done to the shop's records, including by the other
 * administrator.
 */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

  /** Only the timestamp. Every other order would need its own index. */
  private static final Set<String> SORTABLE = Set.of("occurredAt");

  private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "occurredAt");

  private final AuditService audit;
  private final PageQuery pageQuery;

  public AuditController(AuditService audit, PageQuery pageQuery) {
    this.audit = audit;
    this.pageQuery = pageQuery;
  }

  @GetMapping
  public ResponseEntity<PageResponse<Response>> list(
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {

    Pageable pageable = pageQuery.build(page, size, null, SORTABLE, DEFAULT_SORT);

    return ResponseEntity.ok()
        // Never cached. The point of opening this screen is to see what has
        // happened, and a cached answer is the one thing it must not give.
        .header("Cache-Control", "no-store")
        .body(PageResponse.from(audit.list(pageable), Response::from));
  }

  /** One entry, as the settings screen lists it. */
  public record Response(
      String id,
      Instant occurredAt,
      String actorName,
      AuditAction action,
      String entityType,
      String entityId,
      String summary) {

    static Response from(AuditEvent event) {
      return new Response(
          event.getId(),
          event.getOccurredAt(),
          event.getActorName(),
          event.getAction(),
          event.getEntityType(),
          event.getEntityId(),
          event.getSummary());
    }
  }
}
