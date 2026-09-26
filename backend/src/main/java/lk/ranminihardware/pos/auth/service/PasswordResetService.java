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
import lk.ranminihardware.pos.staff.domain.StaffRole;
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
  private final String cashierResetUrlTemplate;

  public PasswordResetService(
      StaffRepository staff,
      PasswordResetTokenRepository tokens,
      SettingsService settings,
      PasswordEncoder passwords,
      ResetMailer mailer,
      Clock clock,
      @Value("${ranmini.auth.reset-token-minutes:45}") long validityMinutes,
      @Value("${ranmini.app.reset-url:http://localhost:3000/admin/reset-password}")
          String resetUrlTemplate,
      @Value("${ranmini.app.cashier-reset-url:http://localhost:3000/cashier/reset-password}")
          String cashierResetUrlTemplate) {
    this.staff = staff;
    this.tokens = tokens;
    this.settings = settings;
    this.passwords = passwords;
    this.mailer = mailer;
    this.clock = clock;
    this.validity = Duration.ofMinutes(validityMinutes);
    this.resetUrlTemplate = resetUrlTemplate;
    this.cashierResetUrlTemplate = cashierResetUrlTemplate;
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
        member.getEmail(), member.getFullName(), buildLink(token, member), validity.toMinutes());
  }

  /**
   * Asks the shop owner to reset a password, for an account with no email.
   *
   * <p>Most cashiers have no address on file, so an emailed link cannot reach
   * them. This records the request on the account instead, where it appears in
   * the administrators' notification feed; the owner answers it by setting a
   * temporary password, and the cashier then chooses their own at sign-in.
   *
   * <p>Silent in exactly the way {@link #requestReset} is: an unknown or
   * deactivated username returns without a trace in the response, so the form
   * cannot be used to find out who works here.
   *
   * @return the account the request was recorded against, for the audit trail,
   *     or empty when nothing was recorded
   */
  public Optional<StaffMember> requestHelp(String username) {
    String name = username == null ? "" : username.trim().toLowerCase(java.util.Locale.ROOT);
    if (name.isEmpty()) return Optional.empty();

    Optional<StaffMember> found = staff.findByUsername(name);

    if (found.isEmpty() || found.get().getStatus() != StaffStatus.ACTIVE) {
      log.info("Password help requested for a username with no active account");
      return Optional.empty();
    }

    StaffMember member = found.get();

    // Re-stamped on a repeat request rather than kept at the first one, so the
    // request comes back to the top of the owner's feed as unread. The rate
    // limit in front of this keeps that from being a way to spam the feed.
    member.setPasswordHelpRequestedAt(Instant.now(clock));
    staff.save(member);

    log.info("Password help requested for {}", member.getUsername());
    return Optional.of(member);
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
    // They chose this password themselves, so nothing is left for an
    // administrator to do: no temporary password to replace, no request open.
    member.setPasswordChangeRequired(false);
    member.setPasswordHelpRequestedAt(null);
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

  /**
   * The link to email, pointing at the recovery page of the person's own portal.
   *
   * <p>Chosen from the account's role rather than from anything in the request,
   * so the page a link opens — and the sign-in screen it returns to afterwards —
   * is always the one that person can actually use. A cashier sent to the admin
   * reset page would set a password and then be refused at the admin door.
   */
  private String buildLink(String token, StaffMember member) {
    String base =
        member.getRole() == StaffRole.CASHIER ? cashierResetUrlTemplate : resetUrlTemplate;
    String separator = base.contains("?") ? "&" : "?";
    return "%s%stoken=%s"
        .formatted(base, separator, java.net.URLEncoder.encode(token, StandardCharsets.UTF_8));
  }

  private static ApiException invalidLink() {
    return ApiException.badRequest(
        "INVALID_RESET_LINK",
        "That reset link is no longer valid. Request a new one and try again.");
  }
}
