package lk.ranminihardware.pos.staff.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * The temporary-password cycle an administrator starts and a cashier finishes.
 *
 * <p>These pin the two promises the recovery flow makes. A password an
 * administrator sets is never the one the cashier ends up using, and the step
 * that replaces it cannot be turned into a way of changing a password without
 * knowing the current one.
 */
class TemporaryPasswordTest {

  private static final Instant NOW = Instant.parse("2026-09-26T04:00:00Z");

  // Cost 4 rather than the production 10: the tests compare hashes, they do not
  // measure how slow brute-forcing them is.
  private final PasswordEncoder passwords = new BCryptPasswordEncoder(4);
  private final StaffRepository repository = mock(StaffRepository.class);
  private final SettingsService settings = mock(SettingsService.class);

  private StaffService service;
  private StaffMember cashier;

  @BeforeEach
  void setUp() {
    when(settings.get()).thenReturn(ShopSettings.defaults());
    when(repository.save(any(StaffMember.class))).thenAnswer(call -> call.getArgument(0));

    service =
        new StaffService(repository, settings, passwords, Clock.fixed(NOW, ZoneOffset.UTC));

    cashier =
        StaffMember.builder()
            .id("c1")
            .username("kasun")
            .fullName("Kasun Perera")
            .role(StaffRole.CASHIER)
            .passwordHash(passwords.encode("original-password"))
            .failedLoginAttempts(5)
            .lockedUntil(NOW.plusSeconds(600))
            .passwordHelpRequestedAt(NOW.minusSeconds(60))
            .build();
    when(repository.findById("c1")).thenReturn(Optional.of(cashier));
  }

  @Test
  @DisplayName("a password set by an administrator must be replaced, and answers the help request")
  void adminResetIsTemporary() {
    StaffMember saved = service.changePassword("c1", "temp-pass-123");

    assertThat(saved.isPasswordChangeRequired()).isTrue();
    assertThat(saved.getPasswordHelpRequestedAt()).isNull();
    assertThat(saved.getFailedLoginAttempts()).isZero();
    assertThat(saved.getLockedUntil()).isNull();
    assertThat(passwords.matches("temp-pass-123", saved.getPasswordHash())).isTrue();
  }

  @Test
  @DisplayName("choosing your own password clears the flag")
  void choosingOwnPasswordClearsTheFlag() {
    service.changePassword("c1", "temp-pass-123");

    StaffMember saved = service.chooseOwnPassword("c1", "my-own-secret-9");

    assertThat(saved.isPasswordChangeRequired()).isFalse();
    assertThat(passwords.matches("my-own-secret-9", saved.getPasswordHash())).isTrue();
  }

  @Test
  @DisplayName("the new password cannot be the temporary one the administrator knows")
  void temporaryPasswordCannotBeKept() {
    service.changePassword("c1", "temp-pass-123");

    assertThatThrownBy(() -> service.chooseOwnPassword("c1", "temp-pass-123"))
        .isInstanceOfSatisfying(
            ApiException.class, ex -> assertThat(ex.getCode()).isEqualTo("PASSWORD_UNCHANGED"));
  }

  @Test
  @DisplayName("an account that is not flagged cannot use this to skip its current password")
  void refusedWhenNotFlagged() {
    assertThatThrownBy(() -> service.chooseOwnPassword("c1", "my-own-secret-9"))
        .isInstanceOfSatisfying(
            ApiException.class,
            ex -> assertThat(ex.getCode()).isEqualTo("PASSWORD_CHANGE_NOT_REQUIRED"));

    verify(repository, never()).save(any());
  }

  @Test
  @DisplayName("the shop's minimum length applies to the chosen password")
  void minimumLengthApplies() {
    service.changePassword("c1", "temp-pass-123");

    assertThatThrownBy(() -> service.chooseOwnPassword("c1", "short"))
        .isInstanceOfSatisfying(
            ApiException.class, ex -> assertThat(ex.getCode()).isEqualTo("WEAK_PASSWORD"));
  }
}
