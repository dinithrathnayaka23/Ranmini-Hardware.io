package lk.ranminihardware.pos.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import lk.ranminihardware.pos.auth.domain.PasswordResetToken;
import lk.ranminihardware.pos.auth.repository.PasswordResetTokenRepository;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Resetting a forgotten password by email.
 *
 * <p>The rules that make this safe, all of which are easy to get wrong:
 *
 * <ul>
 *   <li><b>Asking never reveals whether an account exists.</b> Every request
 *       gets the same answer whether the address is registered, unregistered,
 *       or belongs to a deactivated account. Otherwise this endpoint is a free
 *       tool for discovering who works at the shop.
 *   <li><b>Only a hash of the token is stored.</b> This collection is a list of
 *       ways into accounts; if it leaked with raw tokens in it, every
 *       outstanding request could be hijacked.
 *   <li><b>A token is single-use and short-lived</b>, and spending one
 *       invalidates the person's other outstanding tokens, so old links left in
 *       an inbox stop working.
 *   <li><b>A successful reset clears the lockout.</b> Somebody who has proved
 *       they control the mailbox should not then be told to wait fifteen
 *       minutes.
 * </ul>
 */
@Service
public class PasswordResetService {

  private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

  /** Bytes of randomness in a token. 32 is far past guessable. */
  private static final int TOKEN_BYTES = 32;

  private final StaffRepository staff;
  private final PasswordResetTokenRepository tokens;
  private final SettingsService settings;
  private final PasswordEncoder passwords;
  private final ResetMailer mailer;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();

  private final Duration validity;
  private final String resetUrlTemplate;

  public PasswordResetService(
      StaffRepository staff,
      PasswordResetTokenRepository tokens,
      SettingsService settings,
      PasswordEncoder passwords,
      ResetMailer mailer,
      Clock clock,
      @Value("${ranmini.auth.reset-token-minutes:45}") long validityMinutes,
      @Value("${ranmini.app.reset-url:http://localhost:3000/admin/reset-password}")
          String resetUrlTemplate) {
    this.staff = staff;
    this.tokens = tokens;
    this.settings = settings;
    this.passwords = passwords;
    this.mailer = mailer;
    this.clock = clock;
    this.validity = Duration.ofMinutes(validityMinutes);
    this.resetUrlTemplate = resetUrlTemplate;
  }

  /**
   * Starts a reset for whoever owns the address.
   *
   * <p>Returns nothing and throws nothing when the address is unknown. The
   * caller answers identically either way, which is the whole point: a
   * different response, or even a noticeably different response time, turns
   * this into an account-enumeration oracle.
   */
  public void requestReset(String email) {
    String address = email == null ? "" : email.trim();
    if (address.isEmpty()) return;

    Optional<StaffMember> found = staff.findByEmailIgnoreCase(address);

    if (found.isEmpty()) {
      log.info("Password reset requested for an address with no account");
      return;
    }

    StaffMember member = found.get();

    if (member.getStatus() != StaffStatus.ACTIVE) {
      // A deactivated account must not be recoverable by its former holder;
      // that is what deactivating it meant. Logged, and answered the same way.
      log.warn("Password reset requested for deactivated account {}", member.getUsername());
      return;
    }

    // Any earlier link becomes useless the moment a new one is issued, so a
    // person clicking "send again" cannot end up with several live tokens.
    invalidateOutstanding(member.getId());

    String token = generateToken();
    Instant now = Instant.now(clock);

    tokens.save(
        PasswordResetToken.builder()
            .tokenHash(hash(token))
            .staffId(member.getId())
            .email(member.getEmail())
            .expiresAt(now.plus(validity))
            .createdAt(now)
            .build());

    mailer.sendResetLink(
        member.getEmail(), member.getFullName(), buildLink(token), validity.toMinutes());
  }

  /**
   * Whether a token can still be used.
   *
   * <p>Lets the reset page say "this link has expired" before the person types
   * a new password twice, rather than after.
   */
  public boolean isTokenUsable(String token) {
    return findUsable(token).isPresent();
  }

  /**
   * Sets a new password and spends the token.
   *
   * @throws ApiException when the token is unknown, expired or already used —
   *     all reported identically, because the person's next step is the same in
   *     every case: ask for a new link.
   */
  public void resetPassword(String token, String newPassword) {
    PasswordResetToken reset = findUsable(token).orElseThrow(PasswordResetService::invalidLink);

    StaffMember member =
        staff.findById(reset.getStaffId()).orElseThrow(PasswordResetService::invalidLink);

    // The account may have changed since the link was sent — deactivated, or
    // its address moved to somebody else. Either makes the link void.
    if (member.getStatus() != StaffStatus.ACTIVE
        || member.getEmail() == null
        || !member.getEmail().equalsIgnoreCase(reset.getEmail())) {
      throw invalidLink();
    }

    validateNewPassword(newPassword, member);

    Instant now = Instant.now(clock);

    member.setPasswordHash(passwords.encode(newPassword));
    // They proved control of the mailbox, so a lockout from earlier guessing
    // has served its purpose and would now only punish the owner.
    member.setFailedLoginAttempts(0);
    member.setLockedUntil(null);
    staff.save(member);

    reset.setUsedAt(now);
    tokens.save(reset);

    // Spending one link retires the rest, so a second email sitting in the
    // inbox cannot be replayed later by anyone who reaches it.
    invalidateOutstanding(member.getId());

    log.info("Password reset completed for {}", member.getUsername());
  }

  private void validateNewPassword(String newPassword, StaffMember member) {
    int minimum = settings.get().getSecurity().getMinPasswordLength();

    if (newPassword == null || newPassword.length() < minimum) {
      throw ApiException.badRequest(
          "WEAK_PASSWORD", "The password must be at least %d characters.".formatted(minimum));
    }
    if (newPassword.length() > 128) {
      throw ApiException.badRequest(
          "PASSWORD_TOO_LONG", "The password must be at most 128 characters.");
    }
    if (member.getPasswordHash() != null && passwords.matches(newPassword, member.getPasswordHash())) {
      throw ApiException.badRequest(
          "PASSWORD_UNCHANGED", "The new password must be different from your current one.");
    }
  }

  private Optional<PasswordResetToken> findUsable(String token) {
    if (token == null || token.isBlank()) return Optional.empty();
    return tokens.findByTokenHash(hash(token)).filter(t -> t.isUsable(Instant.now(clock)));
  }

  /** Marks every outstanding token for an account as spent. */
  private void invalidateOutstanding(String staffId) {
    Instant now = Instant.now(clock);
    var outstanding = tokens.findByStaffIdAndUsedAtIsNull(staffId);

    outstanding.forEach(token -> token.setUsedAt(now));
    if (!outstanding.isEmpty()) tokens.saveAll(outstanding);
  }

  /** URL-safe, 32 bytes of entropy, no padding to mangle in a mail client. */
  private String generateToken() {
    byte[] bytes = new byte[TOKEN_BYTES];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  /** SHA-256, hex. See {@link PasswordResetToken} for why not BCrypt. */
  private static String hash(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      // SHA-256 is required of every JVM; if it is missing the platform is
      // broken in ways this service cannot work around.
      throw new IllegalStateException("SHA-256 unavailable", ex);
    }
  }

  private String buildLink(String token) {
    String separator = resetUrlTemplate.contains("?") ? "&" : "?";
    return "%s%stoken=%s"
        .formatted(
            resetUrlTemplate,
            separator,
            java.net.URLEncoder.encode(token, StandardCharsets.UTF_8));
  }

  private static ApiException invalidLink() {
    return ApiException.badRequest(
        "INVALID_RESET_LINK",
        "That reset link is no longer valid. Request a new one and try again.");
  }
}
