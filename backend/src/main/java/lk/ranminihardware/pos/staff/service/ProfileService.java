package lk.ranminihardware.pos.staff.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.media.ImageBytes;
import lk.ranminihardware.pos.staff.domain.StaffAvatar;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.repository.StaffAvatarRepository;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * What a signed-in person may change about their own account.
 *
 * <p>Separate from {@link StaffService}, which is an administrator managing
 * <em>other</em> people, and the difference is not cosmetic:
 *
 * <ul>
 *   <li><b>Every method here works from the username on the verified token</b>,
 *       never an id in the request. There is no way to address somebody else's
 *       account through this service, so no authorisation check to forget.
 *   <li><b>Changing your own password requires the current one.</b> An admin
 *       resetting a forgotten password has already established who the person
 *       is by standing in front of them; someone who walked up to an unlocked
 *       screen has not.
 *   <li><b>Role and status are not editable here.</b> Letting an account change
 *       its own role is privilege escalation with extra steps, and letting it
 *       reactivate itself defeats deactivation entirely.
 * </ul>
 */
@Service
public class ProfileService {

  private final StaffRepository staff;
  private final StaffAvatarRepository avatars;
  private final SettingsService settings;
  private final PasswordEncoder passwords;
  private final Clock clock;

  public ProfileService(
      StaffRepository staff,
      StaffAvatarRepository avatars,
      SettingsService settings,
      PasswordEncoder passwords,
      Clock clock) {
    this.staff = staff;
    this.avatars = avatars;
    this.settings = settings;
    this.passwords = passwords;
    this.clock = clock;
  }

  public StaffMember get(String username) {
    return staff
        .findByUsername(normalise(username))
        // A valid token for an account that no longer exists means the account
        // was removed mid-session. Reported as an ended session rather than a
        // missing record, which is what it means to the person holding it.
        .orElseThrow(
            () ->
                ApiException.badRequest(
                    "SESSION_EXPIRED", "Your session has ended. Please sign in again."));
  }

  /**
   * Updates the details a person owns about themselves.
   *
   * <p>Username is not among them: it is the identity every sale and audit entry
   * refers to, and letting it change means old records point at a name that now
   * belongs to somebody else.
   */
  public StaffMember updateDetails(String username, String fullName, String email, String phone) {
    StaffMember member = get(username);

    String trimmedEmail = trimToNull(email);
    if (trimmedEmail != null
        && !trimmedEmail.equalsIgnoreCase(member.getEmail())
        && staff.existsByEmailIgnoreCase(trimmedEmail)) {
      throw ApiException.conflict("EMAIL_TAKEN", "That email address is already in use.");
    }

    member.setFullName(fullName.trim());
    member.setEmail(trimmedEmail);
    member.setPhone(trimToNull(phone));

    return staff.save(member);
  }

  /**
   * Changes your own password, having proved you know the current one.
   *
   * <p>The lockout counter is deliberately not touched by a wrong current
   * password. This is an already-authenticated session, so it is not a way in —
   * counting it would let somebody lock a colleague out of their own account by
   * fumbling a form on a shared screen.
   */
  public StaffMember changePassword(String username, String currentPassword, String newPassword) {
    StaffMember member = get(username);

    if (member.getPasswordHash() == null
        || !passwords.matches(currentPassword == null ? "" : currentPassword, member.getPasswordHash())) {
      throw ApiException.badRequest("WRONG_PASSWORD", "That is not your current password.");
    }

    int minimum = settings.get().getSecurity().getMinPasswordLength();
    if (newPassword == null || newPassword.length() < minimum) {
      throw ApiException.badRequest(
          "WEAK_PASSWORD", "The new password must be at least %d characters.".formatted(minimum));
    }
    if (newPassword.length() > 128) {
      // Capped so an oversized input cannot be used to burn CPU on hashing.
      throw ApiException.badRequest(
          "PASSWORD_TOO_LONG", "The password must be at most 128 characters.");
    }
    if (passwords.matches(newPassword, member.getPasswordHash())) {
      throw ApiException.badRequest(
          "PASSWORD_UNCHANGED", "The new password must be different from the current one.");
    }

    member.setPasswordHash(passwords.encode(newPassword));
    // A password the person chose themselves settles any recovery in progress.
    member.setPasswordChangeRequired(false);
    member.setPasswordHelpRequestedAt(null);
    return staff.save(member);
  }

  /**
   * Stores a profile picture and stamps the version that busts its cache.
   *
   * <p>The picture and the version are written in that order on purpose. If the
   * second write fails, the reference still points at the previous version and
   * the old picture is what gets served — stale, but coherent. The other order
   * would advertise a version whose bytes are not there yet.
   */
  public StaffMember setAvatar(String username, byte[] data, String contentType) {
    ImageBytes.validate(data, contentType, ImageBytes.MAX_AVATAR_BYTES);

    StaffMember member = get(username);
    Instant now = Instant.now(clock);

    avatars.save(
        StaffAvatar.builder()
            .id(member.getId())
            .contentType(ImageBytes.normaliseType(contentType))
            .data(data)
            .updatedAt(now)
            .build());

    member.setAvatarVersion(now);
    return staff.save(member);
  }

  /** Removes the picture, falling the account back to its initials. */
  public StaffMember removeAvatar(String username) {
    StaffMember member = get(username);

    // Clear the reference first here: a person asking for the picture to be
    // gone should stop seeing it even if deleting the bytes fails.
    member.setAvatarVersion(null);
    StaffMember saved = staff.save(member);

    avatars.deleteById(member.getId());
    return saved;
  }

  /**
   * Records that this person has seen their notifications.
   *
   * <p>Lives here rather than in the notifications module because it writes to
   * the staff document, and one module owning its own collection is the line
   * that keeps the other from reaching into it. The notification feed itself is
   * derived from live data and stores nothing — this stamp is the only piece of
   * notification state anywhere in the system.
   *
   * @param seenAt the moment the feed the person actually saw was generated,
   *     supplied by the caller rather than read from the clock here. A stamp
   *     taken after the feed was built would silently swallow anything that
   *     happened in between.
   */
  public StaffMember markNotificationsRead(String username, Instant seenAt) {
    StaffMember member = get(username);
    member.setNotificationsReadAt(seenAt);
    return staff.save(member);
  }

  /** The stored picture for a staff member, for the image endpoint. */
  public Optional<StaffAvatar> findAvatar(String staffId) {
    return avatars.findById(staffId);
  }

  private static String normalise(String username) {
    return username == null ? "" : username.trim().toLowerCase();
  }

  private static String trimToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
