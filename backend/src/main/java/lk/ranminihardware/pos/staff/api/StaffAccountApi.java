package lk.ranminihardware.pos.staff.api;

import java.util.Optional;

/**
 * What the authentication module is allowed to ask of staff records.
 *
 * <p>The module boundary again: {@code auth} needs to verify a password and
 * track failed attempts, but it must not hold a {@code StaffMember} document or
 * reach into {@code staff.repository}.
 *
 * <p>Note that {@link StaffAccount} carries the password <em>hash</em>. That is
 * unavoidable — something has to compare it — but it is the only type in the
 * codebase that exposes it, it is never serialised, and it exists solely so the
 * comparison happens in one place.
 */
public interface StaffAccountApi {

  /** Looks up an account for sign-in. The username is matched case-insensitively. */
  Optional<StaffAccount> findForAuthentication(String username);

  /**
   * Records a failed sign-in and locks the account once the shop's configured
   * threshold is reached.
   *
   * <p>Counted on the account rather than in memory so a lockout survives a
   * restart and holds across every instance — an in-memory counter is bypassed
   * by restarting the service or by hitting a different replica.
   */
  void recordFailedLogin(String staffId);

  /** Clears the failure count and stamps the last-active time. */
  void recordSuccessfulLogin(String staffId);

  /**
   * Replaces a temporary password with one the person chose themselves.
   *
   * <p>Only allowed while the account is flagged as needing it, so this cannot
   * be used as a way to change a password without knowing the current one.
   *
   * @return the account as it now stands, no longer flagged
   */
  StaffAccount chooseOwnPassword(String staffId, String rawPassword);
}
