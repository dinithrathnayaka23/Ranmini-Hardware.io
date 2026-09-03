package lk.ranminihardware.pos.notifications.web;

import lk.ranminihardware.pos.notifications.service.NotificationService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.service.ProfileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The notification bell.
 *
 * <p>Two endpoints and no request bodies: read the feed, or say you have seen
 * it. The feed is always the caller's own — the read marker comes from the
 * verified token rather than from a parameter, so there is no id to authorise
 * and no way to mark somebody else's notifications read.
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

  private final NotificationService notifications;
  private final ProfileService profiles;

  public NotificationController(NotificationService notifications, ProfileService profiles) {
    this.notifications = notifications;
    this.profiles = profiles;
  }

  /**
   * The current feed.
   *
   * <p>Explicitly uncacheable. Everything else on the portal that reads
   * aggregates gets a short cache window, but an unread badge that is thirty
   * seconds stale is a badge that says nothing happened when something did — and
   * the whole point of the bell is to be the one thing on the page that is
   * current.
   */
  @GetMapping
  public ResponseEntity<NotificationDtos.Feed> feed(Authentication authentication) {
    StaffMember me = profiles.get(username(authentication));

    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .body(notifications.feedFor(me.getNotificationsReadAt()));
  }

  /**
   * Marks everything currently in the feed as read.
   *
   * <p>Returns the feed rather than an empty 204, because the client has just
   * changed what it is showing: the badge has to clear and every row has to lose
   * its unread mark, and a second request to find that out is a round trip the
   * panel would visibly wait for.
   *
   * <p>The stamp stored is the feed's own {@code generatedAt}, not the clock at
   * the top of this method. That is what guarantees the marker never runs ahead
   * of what was actually shown — a notification arriving in the millisecond
   * between the two would otherwise be marked read without anybody seeing it.
   */
  @PostMapping("/read")
  public ResponseEntity<NotificationDtos.Feed> markRead(Authentication authentication) {
    NotificationDtos.Feed feed = notifications.feedAllRead();
    profiles.markNotificationsRead(username(authentication), feed.generatedAt());

    return ResponseEntity.ok().header("Cache-Control", "no-store").body(feed);
  }

  private static String username(Authentication authentication) {
    if (authentication == null || authentication.getName() == null) {
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Please sign in to continue.");
    }
    return authentication.getName();
  }
}
