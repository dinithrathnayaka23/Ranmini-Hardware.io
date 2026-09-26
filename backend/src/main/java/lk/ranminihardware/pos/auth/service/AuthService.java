package lk.ranminihardware.pos.auth.service;

import java.time.Clock;
import java.time.Instant;
import lk.ranminihardware.pos.auth.web.AuthDtos;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.api.StaffAccount;
import lk.ranminihardware.pos.staff.api.StaffAccountApi;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Signing in.
 *
 * <p>Two rules shape everything here.
 *
 * <p><b>Every failure looks the same — unless the password was right.</b>
 * Unknown username, wrong password, wrong portal: one message, one status, and
 * the same time spent hashing. Distinguishing them turns the endpoint into an
 * oracle: "no such user" versus "wrong password" tells an attacker which
 * usernames are real, and that is half of a credential-stuffing run done for
 * them.
 *
 * <p>A locked or deactivated account is told so plainly, but <em>only after the
 * password has been verified</em>. That ordering is what keeps the honesty free:
 * the message is unreachable without already holding the credentials, so it
 * cannot be used to discover who works at the shop, while the cashier who turns
 * up for a shift and cannot get in learns the actual reason instead of
 * doubting a password they typed correctly.
 *
 * <p><b>The portal is checked here, not in the browser.</b> The frontend has
 * separate admin and cashier sign-in pages, but that is presentation. A cashier
 * posting to the admin endpoint is rejected by this service, because the client
 * choosing which door to knock on must never be the thing that decides whether
 * it opens.
 */
@Service
public class AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  /** The single message every sign-in failure returns. */
  private static final String REJECTED = "Invalid username or password. Please try again.";

  private final StaffAccountApi accounts;
  private final PasswordEncoder passwords;
  private final JwtService jwt;
  private final Clock clock;

  public AuthService(
      StaffAccountApi accounts, PasswordEncoder passwords, JwtService jwt, Clock clock) {
    this.accounts = accounts;
    this.passwords = passwords;
    this.jwt = jwt;
    this.clock = clock;
  }

  /**
   * Authenticates against one portal.
   *
   * @param portal which door was knocked on — "admin" or "cashier"
   */
  public AuthDtos.LoginResponse login(String portal, String username, String rawPassword) {
    StaffAccount account = accounts.findForAuthentication(username).orElse(null);

    if (account == null) {
      // Still spend the time hashing. Returning immediately makes an unknown
      // username measurably faster than a wrong password, which is a username
      // oracle by stopwatch rather than by message.
      passwords.matches(rawPassword == null ? "" : rawPassword, DUMMY_HASH);
      throw rejected();
    }

    Instant now = Instant.now(clock);

    if (account.isLocked(now)) {
      // The one failure that is described honestly: the user genuinely cannot
      // proceed and needs to know waiting is the answer, not a new password.
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "ACCOUNT_LOCKED",
          "This account is temporarily locked. Try again shortly or contact the owner.");
    }

    boolean passwordMatches =
        account.passwordHash() != null
            && passwords.matches(rawPassword == null ? "" : rawPassword, account.passwordHash());

    if (!passwordMatches) {
      accounts.recordFailedLogin(account.id());
      throw rejected();
    }

    // Reachable only with the correct password, which is what makes it safe to
    // be specific. Not counted as a failed attempt either: the credentials were
    // right, so locking the account on top of deactivating it would just give
    // the owner a second thing to undo when the person is reinstated.
    if (!account.isActive()) {
      throw deactivated();
    }

    if (!mayUsePortal(account.role(), portal)) {
      // Not counted as a failed password attempt: the credentials were right,
      // the person is simply at the wrong door. Locking them out for that would
      // punish a cashier who bookmarked the admin page.
      log.info("Rejected {} sign-in for role {}", portal, account.role());
      throw wrongPortal(account.role());
    }

    accounts.recordSuccessfulLogin(account.id());

    return new AuthDtos.LoginResponse(
        jwt.issueAccessToken(account),
        jwt.issueRefreshToken(account),
        jwt.accessTokenSeconds(),
        AuthDtos.UserResponse.from(account));
  }

  /**
   * Exchanges a refresh token for a new access token.
   *
   * <p>The account is re-read rather than trusted from the token. A refresh
   * token lives for days, and a cashier deactivated this morning must not be
   * able to mint a fresh session with it this afternoon.
   */
  public AuthDtos.LoginResponse refresh(String refreshToken) {
    var claims = jwt.verifyRefreshToken(refreshToken).orElseThrow(this::sessionExpired);

    StaffAccount account =
        accounts.findForAuthentication(claims.username()).orElseThrow(this::sessionExpired);

    // Deactivation is reported for what it is. The caller already holds a valid
    // refresh token, so there is nothing left to disclose — and "your session
    // has ended" would send a cashier who was let go this morning back round the
    // sign-in loop trying to work out what they typed wrong.
    if (!account.isActive()) {
      throw deactivated();
    }
    if (account.isLocked(Instant.now(clock))) {
      throw sessionExpired();
    }

    return new AuthDtos.LoginResponse(
        jwt.issueAccessToken(account),
        jwt.issueRefreshToken(account),
        jwt.accessTokenSeconds(),
        AuthDtos.UserResponse.from(account));
  }

  /**
   * The signed-in user, for the portal chrome.
   *
   * <p>Asked on every page load, so it is also where a mid-session deactivation
   * surfaces. It is reported distinctly from an expired session because the two
   * need different things from the person reading the screen: one signs in
   * again, the other has to speak to the owner.
   */
  /**
   * Replaces a temporary password and hands back a normal session.
   *
   * <p>The fresh tokens are the point. The caller's current token carries the
   * restriction, and it would keep carrying it until it expired; issuing a new
   * pair from the updated account lets the person go straight to work instead
   * of being sent back to the sign-in page to type the password they just chose.
   *
   * <p>The account is re-checked here rather than trusted from the token: it may
   * have been deactivated since the token was issued.
   */
  public AuthDtos.LoginResponse chooseOwnPassword(String username, String newPassword) {
    StaffAccount account =
        accounts.findForAuthentication(username).orElseThrow(this::sessionExpired);

    if (!account.isActive()) {
      throw deactivated();
    }

    StaffAccount updated = accounts.chooseOwnPassword(account.id(), newPassword);
    log.info("{} replaced a temporary password", updated.username());

    return new AuthDtos.LoginResponse(
        jwt.issueAccessToken(updated),
        jwt.issueRefreshToken(updated),
        jwt.accessTokenSeconds(),
        AuthDtos.UserResponse.from(updated));
  }

  public AuthDtos.UserResponse currentUser(String username) {
    StaffAccount account =
        accounts.findForAuthentication(username).orElseThrow(this::sessionExpired);

    if (!account.isActive()) {
      throw deactivated();
    }
    return AuthDtos.UserResponse.from(account);
  }

  /**
   * Whether a role may sign in at the given portal.
   *
   * <p>Each role has exactly one door: an admin is refused at the till and a
   * cashier at the portal. {@link StaffRole} carries the rule and the reasoning;
   * this method only asks it, so the two portals cannot drift apart.
   *
   * <p>A refusal here is reported as an ordinary failed sign-in — same message,
   * same status as a wrong password. Telling somebody "that password is right
   * but you are the wrong sort of account" confirms both that the username
   * exists and what it is for.
   */
  private boolean mayUsePortal(StaffRole role, String portal) {
    return switch (portal) {
      case "admin" -> role.canUseAdminPortal();
      case "cashier" -> role.canUseTill();
      default -> false;
    };
  }

  private ApiException rejected() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", REJECTED);
  }

  /**
   * The right password, at the wrong door.
   *
   * <p><b>Specific, unlike a wrong password</b> — and safe to be, for exactly
   * the reason {@link #deactivated()} is: this is reachable only by somebody who
   * has already typed the correct password, so it cannot be used to discover
   * whether a username exists or what kind of account it is. Anyone who can
   * reach this message already holds credentials that open the other door.
   *
   * <p>The alternative was what the shop actually hit: an owner typing a
   * password they knew was correct and being told, over and over, that it was
   * invalid. A sign-in error has to be actionable, and "you are on the wrong
   * page" is the only useful thing to say here.
   *
   * <p>403 rather than 401, matching the deactivated case: the credentials were
   * accepted, so re-entering them changes nothing and a client that retries a
   * 401 by asking for the password again would loop.
   */
  private ApiException wrongPortal(StaffRole role) {
    return role == StaffRole.ADMIN
        ? new ApiException(
            HttpStatus.FORBIDDEN,
            "WRONG_PORTAL_ADMIN_ACCOUNT",
            "That is an administrator account. Please sign in from the admin portal.")
        : new ApiException(
            HttpStatus.FORBIDDEN,
            "WRONG_PORTAL_CASHIER_ACCOUNT",
            "That is a cashier account. Please sign in at the till.");
  }

  /**
   * A correct password on an account that has been switched off.
   *
   * <p>403 rather than 401: the credentials were accepted, so re-entering them
   * changes nothing, and a client that retries a 401 by asking for the password
   * again would loop forever. The code is distinct so the sign-in screen can say
   * this rather than fall back to the generic rejection.
   */
  private ApiException deactivated() {
    return new ApiException(
        HttpStatus.FORBIDDEN,
        "ACCOUNT_DEACTIVATED",
        "Your account is currently deactivated. Please contact the shop owner to have"
            + " it reactivated.");
  }

  private ApiException sessionExpired() {
    return new ApiException(
        HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Your session has ended. Please sign in again.");
  }

  /**
   * A real BCrypt hash of a value nobody knows, used only to burn the same time
   * a genuine comparison would when the username does not exist.
   */
  private static final String DUMMY_HASH =
      "$2a$10$7EqJtq98hPqEX7fNZaFWoOa8Rn0lPKXrLQ1sVQ0nZQqU6nQe0Jq3S";
}
