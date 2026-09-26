package lk.ranminihardware.pos.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.staff.api.StaffAccount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Issues and verifies the signed tokens that stand in for a session.
 *
 * <p>Stateless by design: the token carries who you are and what you may do, and
 * any instance can verify it without a shared session store. That is what keeps
 * the API horizontally scalable — server-side sessions would need sticky routing
 * or a shared cache the moment there is a second instance.
 *
 * <p>The trade is that a token cannot be revoked before it expires. Access
 * tokens are therefore deliberately short-lived, and the long-lived refresh
 * token is checked against the account on every use, so deactivating a cashier
 * stops them within the access-token lifetime rather than at some indefinite
 * point.
 */
@Service
public class JwtService {

  private static final Logger log = LoggerFactory.getLogger(JwtService.class);

  /** Claim holding the role, so authorisation needs no database read. */
  private static final String CLAIM_ROLE = "role";

  /** Distinguishes an access token from a refresh token. */
  private static final String CLAIM_TYPE = "typ";

  /**
   * Present, and true, on a session whose password was set by somebody else.
   *
   * <p>Carried in the token so the restriction is enforced on every request
   * without a database read. It cannot outlive the flag: choosing a password
   * issues a fresh pair of tokens without it, and a refresh re-reads the account.
   */
  private static final String CLAIM_PASSWORD_CHANGE = "pwc";

  private static final String TYPE_ACCESS = "access";
  private static final String TYPE_REFRESH = "refresh";

  /**
   * Minimum secret length, in bytes.
   *
   * <p>HS256 keys shorter than this are rejected by the library and are trivially
   * brute-forced. Enforced at startup rather than left to a runtime failure on
   * the first sign-in.
   */
  private static final int MIN_SECRET_BYTES = 32;

  private final SecretKey key;

  /**
   * Access-token lifetime from the environment.
   *
   * <p>No longer the value normally used: Settings → Security owns the session
   * length, because the person who knows whether the till sits unattended in a
   * shop is the shopkeeper, not whoever deployed the service. This is the
   * fallback for a fresh database, and for the moment when the settings cannot
   * be read at all — a sign-in must not fail because a preference is
   * unavailable.
   */
  private final Duration configuredAccessTtl;

  private final Duration refreshTokenTtl;
  private final SettingsService settings;
  private final Clock clock;

  public JwtService(
      @Value("${ranmini.auth.jwt-secret:}") String secret,
      @Value("${ranmini.auth.access-token-minutes:30}") long accessMinutes,
      @Value("${ranmini.auth.refresh-token-days:7}") long refreshDays,
      SettingsService settings,
      Clock clock) {

    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
      // Failing at startup is the point. A service that silently generated its
      // own key would invalidate every session on restart and, worse, would
      // accept tokens signed by a key nobody chose.
      throw new IllegalStateException(
          "RANMINI_AUTH_JWT_SECRET must be set to at least "
              + MIN_SECRET_BYTES
              + " characters. See .env.example.");
    }

    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.configuredAccessTtl = Duration.ofMinutes(accessMinutes);
    this.refreshTokenTtl = Duration.ofDays(refreshDays);
    this.settings = settings;
    this.clock = clock;
  }

  public String issueAccessToken(StaffAccount account) {
    return issue(account, TYPE_ACCESS, accessTokenTtl());
  }

  public String issueRefreshToken(StaffAccount account) {
    return issue(account, TYPE_REFRESH, refreshTokenTtl);
  }

  /**
   * Access-token lifetime in seconds, which the frontend uses for its cookie.
   *
   * <p>Read through the same method that signs the token, so the cookie the
   * browser keeps and the expiry inside the token can never disagree — a cookie
   * outliving its token means a portal that looks signed in and is not.
   */
  public long accessTokenSeconds() {
    return accessTokenTtl().toSeconds();
  }

  /**
   * How long a new access token should last.
   *
   * <p>The shop's own setting, bounded by {@code SettingsService} to something
   * between five minutes and a day. A shorter session is a real thing a shop
   * may want — a till on an open counter — and it is the shopkeeper who knows,
   * so the preference wins over the deployment's default.
   *
   * <p>Changing it does not shorten sessions already issued: a signed token
   * carries its own expiry and cannot be recalled. The new length applies from
   * the next sign-in or refresh, which for a thirty-minute session means within
   * the half hour.
   */
  private Duration accessTokenTtl() {
    try {
      return Duration.ofMinutes(settings.sessionTimeoutMinutes());
    } catch (RuntimeException ex) {
      // Settings unreadable — Mongo down, most likely. Signing in with the
      // deployment's default beats refusing to sign anybody in at all.
      log.warn("Could not read the session timeout setting; using the configured default", ex);
      return configuredAccessTtl;
    }
  }

  private String issue(StaffAccount account, String type, Duration ttl) {
    Instant now = Instant.now(clock);

    return Jwts.builder()
        .subject(account.id())
        .claim("username", account.username())
        .claim("name", account.fullName())
        .claim(CLAIM_ROLE, account.role().name())
        .claim(CLAIM_TYPE, type)
        .claim(CLAIM_PASSWORD_CHANGE, account.passwordChangeRequired() ? Boolean.TRUE : null)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(ttl)))
        .signWith(key)
        .compact();
  }

  /**
   * Verifies an access token.
   *
   * <p>Returns empty for anything wrong — bad signature, expired, or a refresh
   * token presented as an access token. The caller is never told which, because
   * the answer is the same and the distinction only helps an attacker.
   */
  public Optional<AuthenticatedUser> verifyAccessToken(String token) {
    return verify(token, TYPE_ACCESS);
  }

  /** Verifies a refresh token. Callers must still re-check the account. */
  public Optional<AuthenticatedUser> verifyRefreshToken(String token) {
    return verify(token, TYPE_REFRESH);
  }

  private Optional<AuthenticatedUser> verify(String token, String expectedType) {
    if (token == null || token.isBlank()) return Optional.empty();

    try {
      Claims claims =
          Jwts.parser()
              .verifyWith(key)
              .clock(() -> Date.from(Instant.now(clock)))
              .build()
              .parseSignedClaims(token)
              .getPayload();

      // A refresh token must not be usable as an access token: it lives far
      // longer, so accepting one here would quietly extend every session to the
      // refresh lifetime.
      if (!expectedType.equals(claims.get(CLAIM_TYPE, String.class))) {
        return Optional.empty();
      }

      return Optional.of(
          new AuthenticatedUser(
              claims.getSubject(),
              claims.get("username", String.class),
              claims.get("name", String.class),
              claims.get(CLAIM_ROLE, String.class),
              Boolean.TRUE.equals(claims.get(CLAIM_PASSWORD_CHANGE, Boolean.class))));

    } catch (JwtException | IllegalArgumentException ex) {
      // Expected for any invalid token, so logged at debug: a stream of these
      // at warn level would drown the log every time a session expires.
      log.debug("Rejected token: {}", ex.getMessage());
      return Optional.empty();
    }
  }

  /**
   * Who a valid token says the caller is.
   *
   * Implements {@link java.security.Principal} so Spring keeps reporting the
   * username from {@code Authentication.getName()} while a controller that
   * needs the id or the display name can cast the principal and read it —
   * without a database lookup on every request.
   */
  public record AuthenticatedUser(
      String id, String username, String fullName, String role, boolean passwordChangeRequired)
      implements java.security.Principal {

    @Override
    public String getName() {
      return username;
    }
  }
}
