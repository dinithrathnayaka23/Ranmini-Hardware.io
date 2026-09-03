package lk.ranminihardware.pos.notifications.domain;

/**
 * How much the reader should care.
 *
 * <p>Three levels, not five. The panel colours each one and sorts by it, and a
 * scale finer than "stop what you are doing / look at this today / for your
 * information" is a scale nobody applies consistently.
 */
public enum NotificationSeverity {

  /** Money is being lost right now — an empty shelf on a sellable line. */
  CRITICAL,

  /** Act soon, and it is cheap to act now. */
  WARNING,

  /** Worth knowing, nothing to do. */
  INFO
}
