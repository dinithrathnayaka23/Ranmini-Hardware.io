package lk.ranminihardware.pos.staff.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Locale;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Staff accounts.
 *
 * <p>Passwords are hashed with BCrypt and never stored, logged or returned. The
 * encoder is created here rather than injected from a security configuration
 * because that configuration does not exist yet — when the authentication phase
 * lands it should take this over, and this class should stop constructing one.
 */
@Service
public class StaffService {

  /**
   * BCrypt work factor.
   *
   * <p>10 is the library default and takes roughly 100ms on modest hardware,
   * which is the point: it is slow enough to make offline guessing expensive and
   * fast enough that a cashier does not notice it at sign-in. Raising it later
   * is safe — BCrypt records the cost in the hash, so existing passwords keep
   * verifying.
   */
  private static final int BCRYPT_STRENGTH = 10;

  private final StaffRepository staff;
  private final SettingsService settings;
  private final PasswordEncoder passwords;
  private final Clock clock;

  public StaffService(StaffRepository staff, SettingsService settings, Clock clock) {
    this.staff = staff;
    this.settings = settings;
    this.clock = clock;
    this.passwords = new BCryptPasswordEncoder(BCRYPT_STRENGTH);
  }

  public Page<StaffMember> list(StaffStatus status, Pageable pageable) {
    return status == null
        ? staff.findAll(pageable)
        : staff.findByStatusOrderByFullNameAsc(status, pageable);
  }

  public StaffMember get(String id) {
    return staff.findById(id).orElseThrow(() -> ApiException.notFound("Staff member", id));
  }

  public StaffMember create(StaffWrite write, String rawPassword) {
    String username = normaliseUsername(write.username());

    // Checked for a readable message; the unique indexes are the real guarantee.
    if (staff.existsByUsername(username)) {
      throw ApiException.conflict("USERNAME_TAKEN", "That username is already in use.");
    }
    if (write.email() != null && staff.existsByEmailIgnoreCase(write.email())) {
      throw ApiException.conflict("EMAIL_TAKEN", "That email address is already in use.");
    }

    validatePassword(rawPassword);

    return staff.save(
        StaffMember.builder()
            .fullName(write.fullName().trim())
            .username(username)
            .email(write.email() == null ? null : write.email().trim())
            .phone(write.phone())
            .role(write.role())
            .status(StaffStatus.ACTIVE)
            .joinedOn(write.joinedOn() == null ? LocalDate.now(clock) : write.joinedOn())
            .passwordHash(passwords.encode(rawPassword))
            .build());
  }

  /**
   * Updates a staff member's profile.
   *
   * <p>The username is deliberately not editable. It is the identity every
   * audit entry and future session refers to, and letting it change means old
   * records point at a name that now belongs to somebody else.
   */
  public StaffMember update(String id, StaffWrite write) {
    StaffMember member = get(id);

    member.setFullName(write.fullName().trim());
    member.setEmail(write.email() == null ? null : write.email().trim());
    member.setPhone(write.phone());
    member.setRole(write.role());
    if (write.joinedOn() != null) member.setJoinedOn(write.joinedOn());

    return staff.save(member);
  }

  /**
   * Sets a new password.
   *
   * <p>Changing it also clears any lockout: an administrator resetting a
   * forgotten password has plainly established who the person is, and leaving
   * them locked out afterwards would be a support call for nothing.
   */
  public StaffMember changePassword(String id, String rawPassword) {
    validatePassword(rawPassword);

    StaffMember member = get(id);
    member.setPasswordHash(passwords.encode(rawPassword));
    member.setFailedLoginAttempts(0);
    member.setLockedUntil(null);
    return staff.save(member);
  }

  /**
   * Deactivates an account instead of deleting it.
   *
   * <p>Every sale this person rang up names them; a receipt whose cashier cannot
   * be identified is exactly the gap an audit looks for.
   */
  public StaffMember deactivate(String id) {
    StaffMember member = get(id);
    member.setStatus(StaffStatus.INACTIVE);
    return staff.save(member);
  }

  public StaffMember reactivate(String id) {
    StaffMember member = get(id);
    member.setStatus(StaffStatus.ACTIVE);
    member.setFailedLoginAttempts(0);
    member.setLockedUntil(null);
    return staff.save(member);
  }

  /**
   * Enforces the shop's configured minimum length.
   *
   * <p>{@code SettingsService} already floors that setting at 8, so a shop
   * cannot configure its way below what the sign-in form requires.
   */
  private void validatePassword(String rawPassword) {
    int minimum = settings.get().getSecurity().getMinPasswordLength();

    if (rawPassword == null || rawPassword.length() < minimum) {
      throw ApiException.badRequest(
          "WEAK_PASSWORD", "The password must be at least %d characters.".formatted(minimum));
    }
    if (rawPassword.length() > 128) {
      // Capped so an oversized input cannot be used to burn CPU on hashing.
      throw ApiException.badRequest(
          "PASSWORD_TOO_LONG", "The password must be at most 128 characters.");
    }
  }

  private static String normaliseUsername(String username) {
    return username.trim().toLowerCase(Locale.ROOT);
  }

  /** The editable fields of a staff member. */
  public record StaffWrite(
      String fullName,
      String username,
      String email,
      String phone,
      StaffRole role,
      LocalDate joinedOn) {}
}
