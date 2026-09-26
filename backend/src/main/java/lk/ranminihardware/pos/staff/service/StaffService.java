package lk.ranminihardware.pos.staff.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Staff accounts.
 *
 * <p>Passwords are hashed with BCrypt and never stored, logged or returned. The
 * encoder is the one bean defined in SecurityConfig, so the cost factor is set
 * in a single place and a staff password created here verifies identically at
 * sign-in.
 */
@Service
public class StaffService {

  private final StaffRepository staff;
  private final SettingsService settings;
  private final PasswordEncoder passwords;
  private final Clock clock;

  public StaffService(
      StaffRepository staff,
      SettingsService settings,
      PasswordEncoder passwords,
      Clock clock) {
    this.staff = staff;
    this.settings = settings;
    this.passwords = passwords;
    this.clock = clock;
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
    String email = normaliseEmail(write.email());

    // Checked for a readable message; the unique indexes are the real guarantee.
    if (staff.existsByUsername(username)) {
      throw ApiException.conflict("USERNAME_TAKEN", "That username is already in use.");
    }
    if (email != null && staff.existsByEmailIgnoreCase(email)) {
      throw ApiException.conflict("EMAIL_TAKEN", "That email address is already in use.");
    }

    validatePassword(rawPassword);

    return staff.save(
        StaffMember.builder()
            .fullName(write.fullName().trim())
            .username(username)
            .email(email)
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
    String email = normaliseEmail(write.email());

    // Same readable check as on creation. Without it a clash reached the unique
    // index and came back as a generic "record already exists".
    if (email != null
        && !email.equalsIgnoreCase(member.getEmail())
        && staff.existsByEmailIgnoreCase(email)) {
      throw ApiException.conflict("EMAIL_TAKEN", "That email address is already in use.");
    }

    member.setFullName(write.fullName().trim());
    member.setEmail(email);
    member.setPhone(write.phone());
    member.setRole(write.role());
    if (write.joinedOn() != null) member.setJoinedOn(write.joinedOn());

    return staff.save(member);
  }

  /**
   * Sets a temporary password on somebody else's account.
   *
   * <p>Changing it also clears any lockout: an administrator resetting a
   * forgotten password has plainly established who the person is, and leaving
   * them locked out afterwards would be a support call for nothing. It also
   * closes any open request for help, since this is the answer to it.
   *
   * <p><b>The password is temporary.</b> The account is flagged so that its next
   * session can do nothing but choose a replacement. The administrator has seen
   * this password, and probably said it out loud at the counter; a password
   * other people know is not a credential that identifies anyone.
   */
  public StaffMember changePassword(String id, String rawPassword) {
    validatePassword(rawPassword);

    StaffMember member = get(id);
    member.setPasswordHash(passwords.encode(rawPassword));
    member.setPasswordChangeRequired(true);
    member.setPasswordHelpRequestedAt(null);
    member.setFailedLoginAttempts(0);
    member.setLockedUntil(null);
    return staff.save(member);
  }

  /**
   * Replaces a temporary password with one the person chose.
   *
   * <p>Refused unless the account is actually flagged. The session calling this
   * has proved it knows the temporary password, not the person's real one, so
   * outside that one situation it must not be a way to change a password
   * without supplying the current one.
   *
   * <p>The new password must differ from the temporary one; otherwise the
   * administrator who issued it would still know it.
   */
  public StaffMember chooseOwnPassword(String id, String rawPassword) {
    StaffMember member = get(id);

    if (!member.isPasswordChangeRequired()) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "PASSWORD_CHANGE_NOT_REQUIRED",
          "Your password has already been set. Change it from your profile instead.");
    }

    validatePassword(rawPassword);

    if (member.getPasswordHash() != null && passwords.matches(rawPassword, member.getPasswordHash())) {
      throw ApiException.badRequest(
          "PASSWORD_UNCHANGED",
          "Choose a password of your own, different from the temporary one you were given.");
    }

    member.setPasswordHash(passwords.encode(rawPassword));
    member.setPasswordChangeRequired(false);
    member.setPasswordHelpRequestedAt(null);
    return staff.save(member);
  }

  /**
   * Accounts whose holder has asked the owner for a new password, newest first.
   *
   * <p>Capped, and served by a sparse index that only holds open requests, so it
   * stays cheap however many staff records the shop accumulates.
   */
  public List<StaffMember> pendingPasswordHelp(int limit) {
    return staff.findByPasswordHelpRequestedAtIsNotNullAndStatusOrderByPasswordHelpRequestedAtDesc(
        StaffStatus.ACTIVE, PageRequest.of(0, Math.clamp(limit, 1, 50)));
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

  /**
   * An email as stored: trimmed, and null rather than blank.
   *
   * <p>Null matters. The unique email index only covers string values, which is
   * what lets many cashiers have no address; an empty string is a string, so the
   * second account saved with "" would collide with the first. A blank form
   * field must therefore mean "no address", never an empty one.
   */
  private static String normaliseEmail(String email) {
    if (email == null) return null;
    String trimmed = email.trim();
    return trimmed.isEmpty() ? null : trimmed;
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
