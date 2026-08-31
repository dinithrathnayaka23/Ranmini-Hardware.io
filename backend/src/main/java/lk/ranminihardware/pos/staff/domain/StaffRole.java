package lk.ranminihardware.pos.staff.domain;

/**
 * What someone is allowed to do, and which portal they may sign in to.
 *
 * <p>Two roles, because the shop has two jobs. {@link #ADMIN} is the business
 * owner and his son — they have <b>identical</b> privileges, and there is
 * deliberately no notion of a senior or junior admin. {@link #CASHIER} is
 * whoever is on the counter: they reach the till and nothing else.
 *
 * <p>Kept this short on purpose. Extra roles nobody has asked for turn into
 * permission checks nobody can explain, and the shop is small enough that the
 * real distinction is "runs the business" versus "serves customers".
 */
public enum StaffRole {

  /** Owner-level access: the whole management portal, and the till. */
  ADMIN,

  /** The till, and nothing else. */
  CASHIER;

  /** Whether this role may sign in to the management portal. */
  public boolean canUseAdminPortal() {
    return this == ADMIN;
  }

  /**
   * Whether this role may sign in to the till.
   *
   * <p>Admins can, so the owner can cover the counter without a second account —
   * which is exactly what happens in a shop this size when the cashier is off.
   */
  public boolean canUseTill() {
    return true;
  }
}
