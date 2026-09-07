package lk.ranminihardware.pos.staff.domain;

/**
 * What someone is allowed to do, and which portal they may sign in to.
 *
 * <p>Two roles, because the shop has two jobs. {@link #ADMIN} is the business
 * owner and his son — they have <b>identical</b> privileges, and there is
 * deliberately no notion of a senior or junior admin. {@link #CASHIER} is
 * whoever is on the counter.
 *
 * <p><b>The two doors do not overlap.</b> An admin cannot sign in at the till
 * and a cashier cannot sign in to the portal. This is stricter than it was: an
 * admin used to be allowed at the till so the owner could cover the counter.
 * The shop asked for the separation instead, and it is the safer arrangement —
 * every sale is then attributed to the person who is actually meant to be on
 * the counter, and an owner absent-mindedly leaving the portal signed in on the
 * counter machine no longer exposes the whole business to whoever walks past
 * it. If the owner does need to serve customers, they get a cashier account.
 *
 * <p>Kept this short on purpose. Extra roles nobody has asked for turn into
 * permission checks nobody can explain, and the shop is small enough that the
 * real distinction is "runs the business" versus "serves customers".
 */
public enum StaffRole {

  /** Owner-level access: the whole management portal, and only that. */
  ADMIN,

  /** The till, and only that. */
  CASHIER;

  /** Whether this role may sign in to the management portal. */
  public boolean canUseAdminPortal() {
    return this == ADMIN;
  }

  /**
   * Whether this role may sign in to the till.
   *
   * <p>Cashiers only. An admin is refused here exactly as a cashier is refused
   * at the portal — see the note on this enum for why the shop wanted the two
   * kept apart.
   */
  public boolean canUseTill() {
    return this == CASHIER;
  }
}
