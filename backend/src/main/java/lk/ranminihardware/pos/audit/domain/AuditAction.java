package lk.ranminihardware.pos.audit.domain;

/**
 * What was done, from the closed set of things worth recording.
 *
 * <p><b>Not everything is here, deliberately.</b> An audit log that records
 * every read is a log nobody reads: it buries the twenty entries a year that
 * matter under a million that do not, and it costs storage and write throughput
 * on the hottest paths in the system. What is listed below is the set where
 * somebody could later ask "who did that, and when" and genuinely need an
 * answer — money reversed, an account's access changed, a shop rule rewritten.
 *
 * <p>Stock movements are absent for a different reason: they already have a
 * dedicated ledger in {@code stock_movements}, which records every change with
 * its reason and resulting quantity. Duplicating them here would give the shop
 * two records of the same event that could disagree.
 *
 * <p>Sign-ins are absent too. A successful sign-in happens dozens of times a
 * day and proves nothing on its own; a failed one is already counted on the
 * account and drives the lockout.
 */
public enum AuditAction {

  /** A completed sale was cancelled: stock returned, takings reduced. */
  SALE_VOIDED,

  /** A product was withdrawn from sale. Nothing is deleted, so this is reversible. */
  PRODUCT_WITHDRAWN,

  PRODUCT_RESTORED,

  /** A new staff account was created, and can now sign in. */
  STAFF_CREATED,

  /** An account was switched off, or back on. */
  STAFF_DEACTIVATED,

  STAFF_REACTIVATED,

  /**
   * Somebody's role changed.
   *
   * <p>Recorded separately from an ordinary profile edit because it is the one
   * field that changes what an account is allowed to do.
   */
  STAFF_ROLE_CHANGED,

  /** An administrator set another person's password. */
  STAFF_PASSWORD_RESET,

  /**
   * Somebody asked, from the sign-in page, for the owner to reset their password.
   *
   * <p>Recorded because it is an anonymous request that changes what the owner
   * is shown; if the feed ever fills with requests nobody made, this is where
   * the pattern shows.
   */
  STAFF_PASSWORD_HELP_REQUESTED,

  /** A section of the shop's configuration was saved. */
  SETTINGS_CHANGED
}
