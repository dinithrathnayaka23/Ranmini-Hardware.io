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
  private final Duration accessTokenTtl;
  private final Duration refreshTokenTtl;
  private final Clock clock;

  public JwtService(
      @Value("${ranmini.auth.jwt-secret:}") String secret,
      @Value("${ranmini.auth.access-token-minutes:30}") long accessMinutes,
      @Value("${ranmini.auth.refresh-token-days:7}") long refreshDays,
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
    this.accessTokenTtl = Duration.ofMinutes(accessMinutes);
    this.refreshTokenTtl = Duration.ofDays(refreshDays);
    this.clock = clock;
  }

  public String issueAccessToken(StaffAccount account) {
    return issue(account, TYPE_ACCESS, accessTokenTtl);
  }

  public String issueRefreshToken(StaffAccount account) {
    return issue(account, TYPE_REFRESH, refreshTokenTtl);
  }

  /** Access-token lifetime in seconds, which the frontend uses for its cookie. */
  public long accessTokenSeconds() {
    return accessTokenTtl.toSeconds();
  }

  private String issue(StaffAccount account, String type, Duration ttl) {
    Instant now = Instant.now(clock);

    return Jwts.builder()
        .subject(account.id())
        .claim("username", account.username())
        .claim("name", account.fullName())
        .claim(CLAIM_ROLE, account.role().name())
        .claim(CLAIM_TYPE, type)
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
              claims.get(CLAIM_ROLE, String.class)));

    } catch (JwtException | IllegalArgumentException ex) {
      // Expected for any invalid token, so logged at debug: a stream of these
      // at warn level would drown the log every time a session expires.
      log.debug("Rejected token: {}", ex.getMessage());
      return Optional.empty();
    }
  }

  /** Who a valid token says the caller is. */
  public record AuthenticatedUser(String id, String username, String fullName, String role) {}
}
