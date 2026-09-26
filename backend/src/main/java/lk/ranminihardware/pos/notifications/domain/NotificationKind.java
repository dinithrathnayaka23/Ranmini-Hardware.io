package lk.ranminihardware.pos.notifications.domain;

/**
 * What a notification is about.
 *
 * <p>A closed set rather than a free-text category, because the portal picks an
 * icon and a destination from it. A string would let the backend invent a kind
 * the frontend renders as a blank row.
 */
public enum NotificationKind {

  /** A product the shop cannot sell at all until it is restocked. */
  OUT_OF_STOCK,

  /** A product at or below its own reorder level. */
  LOW_STOCK,

  /**
   * A completed sale that was cancelled afterwards.
   *
   * <p>Surfaced to the owner deliberately. A void returns stock and reverses
   * the day's takings, and a till where voids can happen unseen is the oldest
   * hole in retail — this is the notification that closes it.
   */
  SALE_VOIDED,

  /**
   * Somebody asked, from the sign-in page, for their password to be reset.
   *
   * <p>How a cashier with no email address recovers their account. It stays in
   * the feed until an administrator sets them a temporary password, or they
   * recover it some other way.
   */
  PASSWORD_HELP
}
