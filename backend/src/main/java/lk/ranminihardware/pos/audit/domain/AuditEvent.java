package lk.ranminihardware.pos.audit.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One recorded action.
 *
 * <p>Append-only by construction: nothing in the service updates or deletes an
 * event, and there is no endpoint that can. A log an administrator can edit is
 * not evidence of anything — which is the entire reason the collection exists.
 *
 * <p>The actor's name is denormalised alongside their id, for the same reason a
 * sale stores its cashier's name: the entry has to stay readable after the
 * person leaves and their account is gone. An id on its own turns a year-old
 * audit trail into a list of hex strings.
 */
@Document(collection = "audit_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditEvent {

  @Id private String id;

  private Instant occurredAt;

  /** The signed-in account that did it, or null for a system action. */
  private String actorId;

  /** Denormalised, so the entry survives the account being removed. */
  private String actorName;

  private AuditAction action;

  /**
   * What kind of thing was acted on — "SALE", "PRODUCT", "STAFF", "SETTINGS".
   *
   * <p>A string rather than an enum: the audit module deliberately knows nothing
   * about the other modules' types, and a closed enum here would have to be
   * edited every time one of them grew a new kind of record.
   */
  private String entityType;

  private String entityId;

  /**
   * A sentence a person can read without looking anything up.
   *
   * <p>Written by the caller at the moment it happened, rather than assembled
   * from ids when the log is displayed. That costs a little storage and buys
   * the one property that matters: the entry still means something in five
   * years, after the product was renamed and the setting was changed again.
   */
  private String summary;
}
