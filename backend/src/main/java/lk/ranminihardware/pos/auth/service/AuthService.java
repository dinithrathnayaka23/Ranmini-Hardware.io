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
 * <p><b>Every failure looks the same.</b> Unknown username, wrong password,
 * deactivated account, wrong portal — all answered with one message and one
 * status. Distinguishing them turns the endpoint into an oracle: "no such user"
 * versus "wrong password" tells an attacker which usernames are real, and that
 * is half of a credential-stuffing run done for them.
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

    if (!account.isActive()
        || account.passwordHash() == null
        || !passwords.matches(rawPassword == null ? "" : rawPassword, account.passwordHash())) {

      accounts.recordFailedLogin(account.id());
      throw rejected();
    }

    if (!mayUsePortal(account.role(), portal)) {
      // Not counted as a failed password attempt: the credentials were right,
      // the person is simply at the wrong door. Locking them out for that would
      // punish a cashier who bookmarked the admin page.
      log.info("Rejected {} sign-in for role {}", portal, account.role());
      throw rejected();
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

    if (!account.isActive() || account.isLocked(Instant.now(clock))) {
      throw sessionExpired();
    }

    return new AuthDtos.LoginResponse(
        jwt.issueAccessToken(account),
        jwt.issueRefreshToken(account),
        jwt.accessTokenSeconds(),
        AuthDtos.UserResponse.from(account));
  }

  /** The signed-in user, for the portal chrome. */
  public AuthDtos.UserResponse currentUser(String username) {
    return accounts
        .findForAuthentication(username)
        .filter(StaffAccount::isActive)
        .map(AuthDtos.UserResponse::from)
        .orElseThrow(this::sessionExpired);
  }

  /**
   * Whether a role may sign in at the given portal.
   *
   * <p>An admin may use the till as well as the portal, so the owner can cover
   * the counter without a second account — which is what actually happens in a
   * shop this size when the cashier is off.
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
