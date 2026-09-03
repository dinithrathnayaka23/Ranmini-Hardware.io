package lk.ranminihardware.pos.notifications.web;

import java.time.Instant;
import java.util.List;
import lk.ranminihardware.pos.notifications.domain.NotificationKind;
import lk.ranminihardware.pos.notifications.domain.NotificationSeverity;

/** Response shapes for the notification panel. */
public final class NotificationDtos {

  private NotificationDtos() {}

  /**
   * What the bell and its panel need, in one response.
   *
   * @param unreadCount the badge on the bell. Sent as its own figure rather than
   *     left for the client to count, because the panel shows a capped list
   *     while the badge must still be able to say twenty — counting the rows on
   *     screen would under-report the moment the cap bites.
   */
  public record Feed(List<Item> items, int unreadCount, Instant generatedAt) {}

  /**
   * One row in the panel.
   *
   * @param id stable for as long as the underlying state is unchanged, so the
   *     client can key on it without the list flickering on every poll
   * @param entityType what this is about, left for the frontend to turn into a
   *     link. The API deliberately does not send a URL: the portal's route table
   *     is the frontend's business, and a path baked into a response here would
   *     be a second place to update when a screen moves.
   * @param unread whether it happened after this person last opened the panel
   */
  public record Item(
      String id,
      NotificationKind kind,
      NotificationSeverity severity,
      String title,
      String detail,
      Instant occurredAt,
      boolean unread,
      String entityType,
      String entityId) {}
}
