package lk.ranminihardware.pos.auth.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import lk.ranminihardware.pos.auth.service.JwtService;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.config.SecurityConfig;
import lk.ranminihardware.pos.staff.api.StaffAccount;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * A temporary-password session is given no role.
 *
 * <p>SecurityConfig refuses every business endpoint to a caller without a role,
 * so this mapping is the whole of the restriction. If the filter ever granted
 * {@code ROLE_CASHIER} to such a token, the till would open for a password the
 * owner has seen.
 */
class RestrictedSessionFilterTest {

  private final JwtService jwt = jwtService();
  private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt);

  @AfterEach
  void clearContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName("a restricted token is granted only the password-change authority")
  void restrictedTokenHasNoRole() throws Exception {
    assertThat(authoritiesFor(true)).containsExactly(SecurityConfig.PASSWORD_CHANGE_AUTHORITY);
  }

  @Test
  @DisplayName("an ordinary token is granted its role")
  void ordinaryTokenHasItsRole() throws Exception {
    assertThat(authoritiesFor(false)).containsExactly("ROLE_CASHIER");
  }

  private java.util.List<String> authoritiesFor(boolean passwordChangeRequired) throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/pos/products");
    request.addHeader(
        "Authorization", "Bearer " + jwt.issueAccessToken(account(passwordChangeRequired)));

    filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

    return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .toList();
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
        Clock.fixed(Instant.parse("2026-09-26T04:00:00Z"), ZoneOffset.UTC));
  }
}
