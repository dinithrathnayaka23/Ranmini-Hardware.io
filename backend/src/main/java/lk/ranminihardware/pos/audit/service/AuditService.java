package lk.ranminihardware.pos.audit.service;

import java.time.Clock;
import java.time.Instant;
import lk.ranminihardware.pos.audit.domain.AuditAction;
import lk.ranminihardware.pos.audit.domain.AuditEvent;
import lk.ranminihardware.pos.audit.repository.AuditEventRepository;
import lk.ranminihardware.pos.auth.service.JwtService.AuthenticatedUser;
import lk.ranminihardware.pos.settings.service.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Records the handful of actions somebody may later have to account for.
 *
 * <p>This exists because Settings → Security had an "Audit Log" switch that
 * turned nothing on or off. The switch now gates a real log, and the log is
 * deliberately narrow — see {@link AuditAction} for what is recorded and, more
 * importantly, what is not.
 *
 * <p><b>The actor is read from the security context, never passed in.</b> A
 * method that accepted an actor could be called with somebody else's name, by a
 * caller that got it wrong or by one that meant to. Taking it from the verified
 * token means an entry cannot claim the wrong person did something.
 *
 * <p><b>A failure here never fails the operation it describes.</b> Voiding a
 * sale returns stock to the shelf and reverses the day's takings; refusing to
 * complete that because the log could not be written would leave the shop worse
 * off than the missing entry does. The failure is logged loudly instead. That is
 * the right trade for a shop till and the wrong one for, say, a bank — worth
 * knowing which this is.
 */
@Service
public class AuditService {

  private static final Logger log = LoggerFactory.getLogger(AuditService.class);

  /** Longest summary stored, so one caller cannot fill the collection. */
  private static final int MAX_SUMMARY = 500;

  private final AuditEventRepository events;
  private final SettingsService settings;
  private final Clock clock;

  public AuditService(
      AuditEventRepository events, SettingsService settings, Clock clock) {
    this.events = events;
    this.settings = settings;
    this.clock = clock;
  }

  /**
   * Writes one entry, if the shop has the audit log switched on.
   *
   * @param entityType what kind of record was acted on, e.g. "SALE"
   * @param entityId which one, so the entry can be traced back
   * @param summary a sentence a person can read without looking anything up
   */
  public void record(
      AuditAction action, String entityType, String entityId, String summary) {

    if (!isEnabled()) return;
    write(action, entityType, entityId, summary);
  }

  /**
   * Records that the audit log itself was switched off.
   *
   * <p>The one entry written whatever the switch says, and the reason the
   * switch is not simply an early return everywhere. Somebody turning logging
   * off is precisely the event a log exists to capture: if the act of disabling
   * it were itself unrecorded, the trail would end with no explanation of why,
   * which is indistinguishable from a trail somebody deleted.
   *
   * <p>Turning it back on needs no such treatment — that entry is recorded
   * normally, because logging is on by the time it is written.
   */
  public void recordLoggingDisabled() {
    write(
        AuditAction.SETTINGS_CHANGED,
        "SETTINGS",
        "security",
        "Switched the audit log off. Nothing further is recorded until it is switched"
            + " back on.");
  }

  /** Whether the shop currently has recording switched on. */
  private boolean isEnabled() {
    try {
      return settings.isAuditLogEnabled();
    } catch (RuntimeException ex) {
      // Settings unreadable. Recording is the safer failure: an entry too many
      // costs a row, an entry missing costs the answer to a question somebody
      // is asking precisely because something went wrong.
      log.warn("Could not read the audit log setting; recording anyway", ex);
      return true;
    }
  }

  private void write(
      AuditAction action, String entityType, String entityId, String summary) {

    try {
      Actor actor = currentActor();

      events.save(
          AuditEvent.builder()
              .occurredAt(Instant.now(clock))
              .actorId(actor.id())
              .actorName(actor.name())
              .action(action)
              .entityType(entityType)
              .entityId(entityId)
              .summary(truncate(summary))
              .build());

    } catch (RuntimeException ex) {
      // Never rethrown — see the class note. Logged with everything needed to
      // reconstruct the entry by hand if it ever matters.
      log.error(
          "Could not write audit entry: action={} entity={}:{} summary={}",
          action,
          entityType,
          entityId,
          summary,
          ex);
    }
  }

  /** The log, newest first. Reading it is an administrator-only endpoint. */
  public Page<AuditEvent> list(Pageable pageable) {
    return events.findAllByOrderByOccurredAtDesc(pageable);
  }

  /**
   * Who is doing this, according to the verified token.
   *
   * <p>Falls back to a named system actor rather than null when there is no
   * authentication — a seeder or a scheduled job. "Unknown" would read as a
   * gap in the trail; "System" says plainly that nobody was signed in.
   */
  private Actor currentActor() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication != null
        && authentication.getPrincipal() instanceof AuthenticatedUser user) {
      return new Actor(user.id(), user.fullName());
    }
    if (authentication != null && authentication.getName() != null) {
      return new Actor(null, authentication.getName());
    }
    return new Actor(null, "System");
  }

  private record Actor(String id, String name) {}

  private static String truncate(String summary) {
    if (summary == null) return "";
    return summary.length() <= MAX_SUMMARY ? summary : summary.substring(0, MAX_SUMMARY);
  }
}
