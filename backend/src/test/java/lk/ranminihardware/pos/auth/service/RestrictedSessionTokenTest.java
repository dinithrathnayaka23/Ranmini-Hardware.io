package lk.ranminihardware.pos.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.staff.api.StaffAccount;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The restriction on a temporary-password session travels in its token.
 *
 * <p>That is what lets every request enforce it without a database read — and
 * what makes it dangerous to lose silently. If the claim stopped round-tripping,
 * a cashier holding a password the owner knows would get a full till session.
 */
class RestrictedSessionTokenTest {

  private static final Instant NOW = Instant.parse("2026-09-26T04:00:00Z");

  private final JwtService jwt = jwtService();

  @Test
  @DisplayName("a session that must change its password says so in its token")
  void flaggedAccountIssuesRestrictedToken() {
    var user = jwt.verifyAccessToken(jwt.issueAccessToken(account(true))).orElseThrow();

    assertThat(user.passwordChangeRequired()).isTrue();
  }

  @Test
  @DisplayName("an ordinary session carries no restriction")
  void ordinaryAccountIssuesNormalToken() {
    var user = jwt.verifyAccessToken(jwt.issueAccessToken(account(false))).orElseThrow();

    assertThat(user.passwordChangeRequired()).isFalse();
    assertThat(user.role()).isEqualTo("CASHIER");
  }

  @Test
  @DisplayName("the restriction survives a refresh, so waiting it out does not work")
  void refreshTokenCarriesTheRestriction() {
    var user = jwt.verifyRefreshToken(jwt.issueRefreshToken(account(true))).orElseThrow();

    assertThat(user.passwordChangeRequired()).isTrue();
  }

  private static StaffAccount account(boolean passwordChangeRequired) {
    return new StaffAccount(
        "c1",
        "kasun",
        "Kasun Perera",
        null,
        StaffRole.CASHIER,
        StaffStatus.ACTIVE,
        "hash",
        null,
        null,
        passwordChangeRequired);
  }

  private static JwtService jwtService() {
    SettingsService settings = mock(SettingsService.class);
    when(settings.sessionTimeoutMinutes()).thenReturn(30);
    return new JwtService(
        "a-test-signing-key-that-is-at-least-32-bytes-long",
        30,
        7,
        settings,
        Clock.fixed(NOW, ZoneOffset.UTC));
  }
}
