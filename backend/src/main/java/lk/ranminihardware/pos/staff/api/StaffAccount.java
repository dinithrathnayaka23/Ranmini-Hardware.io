package lk.ranminihardware.pos.staff.api;

import java.time.Instant;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;

/**
 * A staff record as the authentication module sees it.
 *
 * Carries the password hash because something has to compare it, but nothing
 * else does: this type is never serialised to a response and never logged.
 *
 * @param lockedUntil when the account stops being locked, or null when it is
 *     usable. Checked before the password is even compared, so a locked account
 *     cannot be probed by timing.
 */
public record StaffAccount(
    String id,
    String username,
    String fullName,
    String email,
    StaffRole role,
    StaffStatus status,
    String passwordHash,
    Instant lockedUntil,
    /** When the profile picture last changed, or null when there is none. */
    Instant avatarVersion) {

  /** An inactive account can never sign in, whatever the password is. */
  public boolean isActive() {
    return status == StaffStatus.ACTIVE;
  }

  public boolean isLocked(Instant now) {
    return lockedUntil != null && lockedUntil.isAfter(now);
  }
}
