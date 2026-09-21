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
 * The till's notification bell.
 *
 * <p>Mounted under {@code /api/v1/pos} rather than beside the portal's bell,
 * which is what makes it cashiers-only: {@code SecurityConfig} grants that whole
 * prefix to {@code ROLE_CASHIER} and nothing else. A flag on the existing
 * controller would have put the decision in a parameter, where it could be got
 * wrong; the path puts it in the one place that is already read as the access
 * rule.
 *
 * <p>The feed itself is narrower than the portal's by design — see
 * {@link NotificationService#tillFeedFor} for what is deliberately not in it and
 * why. The short version: a cashier is shown what is happening to the shelf in
 * front of them, and nothing about how the shop is doing.
 *
 * <p>The read marker is the same per-person stamp the portal uses, taken from
 * the verified token. There is no id to pass and so no way to mark somebody
 * else's notifications read.
 */
@RestController
@RequestMapping("/api/v1/pos/notifications")
public class PosNotificationController {

  private final NotificationService notifications;
  private final ProfileService profiles;

  public PosNotificationController(
      NotificationService notifications, ProfileService profiles) {
    this.notifications = notifications;
    this.profiles = profiles;
  }

  /**
   * The current feed.
   *
   * <p>Explicitly uncacheable, for the same reason the portal's is: a stock
   * warning that is thirty seconds stale is a warning about a shelf that has
   * already been emptied by the customer being served.
   */
  @GetMapping
  public ResponseEntity<NotificationDtos.Feed> feed(Authentication authentication) {
    StaffMember me = profiles.get(username(authentication));

    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .body(notifications.tillFeedFor(me.getNotificationsReadAt()));
  }

  /**
   * Marks everything currently in the feed as read.
   *
   * <p>Returns the feed it marked rather than an empty 204: the badge has to
   * clear and every row has to lose its unread dot, and a second request to
   * learn that is a round trip the panel would visibly wait for on a counter
   * machine.
   *
   * <p>The stamp stored is the feed's own {@code generatedAt}, so the marker can
   * never run ahead of what was actually shown.
   */
  @PostMapping("/read")
  public ResponseEntity<NotificationDtos.Feed> markRead(Authentication authentication) {
    NotificationDtos.Feed feed = notifications.tillFeedAllRead();
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
