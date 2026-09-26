package lk.ranminihardware.pos.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import lk.ranminihardware.pos.auth.domain.PasswordResetToken;
import lk.ranminihardware.pos.auth.repository.PasswordResetTokenRepository;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Both ways a cashier gets back into their account without signing in.
 *
 * <p>By email when the account has an address, landing on the till's own
 * recovery page; and by asking the owner when it has none. Either way the answer
 * to an unknown or deactivated account is silence, never an error.
 */
class PasswordRecoveryTest {

  private static final Instant NOW = Instant.parse("2026-09-26T04:00:00Z");
  private static final String ADMIN_URL = "https://shop.example/admin/reset-password";
  private static final String CASHIER_URL = "https://shop.example/cashier/reset-password";

  private final PasswordEncoder passwords = new BCryptPasswordEncoder(4);
  private final StaffRepository staff = mock(StaffRepository.class);
  private final PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
  private final SettingsService settings = mock(SettingsService.class);
  private final ResetMailer mailer = mock(ResetMailer.class);

  private PasswordResetService service;

  @BeforeEach
  void setUp() {
    when(settings.get()).thenReturn(ShopSettings.defaults());
    when(staff.save(any(StaffMember.class))).thenAnswer(call -> call.getArgument(0));
    when(tokens.save(any(PasswordResetToken.class))).thenAnswer(call -> call.getArgument(0));
    when(tokens.findByStaffIdAndUsedAtIsNull(anyString())).thenReturn(List.of());

    service =
        new PasswordResetService(
            staff,
            tokens,
            settings,
            passwords,
            mailer,
            Clock.fixed(NOW, ZoneOffset.UTC),
            45,
            ADMIN_URL,
            CASHIER_URL);
  }

  @Test
  @DisplayName("a cashier's reset link opens the till's recovery page")
  void cashierLinkPointsAtTheTill() {
    StaffMember cashier = member("c1", "kasun", StaffRole.CASHIER, "kasun@example.com");
    when(staff.findByEmailIgnoreCase("kasun@example.com")).thenReturn(Optional.of(cashier));

    service.requestReset("kasun@example.com");

    assertThat(sentLink()).startsWith(CASHIER_URL + "?token=");
  }

  @Test
  @DisplayName("an administrator's reset link still opens the portal's recovery page")
  void adminLinkPointsAtThePortal() {
    StaffMember owner = member("a1", "owner", StaffRole.ADMIN, "owner@example.com");
    when(staff.findByEmailIgnoreCase("owner@example.com")).thenReturn(Optional.of(owner));

    service.requestReset("owner@example.com");

    assertThat(sentLink()).startsWith(ADMIN_URL + "?token=");
  }

  @Test
  @DisplayName("using the emailed link settles a temporary password and an open help request")
  void emailResetClearsRecoveryState() {
    StaffMember cashier = member("c1", "kasun", StaffRole.CASHIER, "kasun@example.com");
    cashier.setPasswordChangeRequired(true);
    cashier.setPasswordHelpRequestedAt(NOW.minusSeconds(300));
    when(staff.findByEmailIgnoreCase("kasun@example.com")).thenReturn(Optional.of(cashier));
    when(staff.findById("c1")).thenReturn(Optional.of(cashier));

    service.requestReset("kasun@example.com");

    ArgumentCaptor<PasswordResetToken> issued = ArgumentCaptor.forClass(PasswordResetToken.class);
    verify(tokens).save(issued.capture());
    when(tokens.findByTokenHash(issued.getValue().getTokenHash()))
        .thenReturn(Optional.of(issued.getValue()));

    String token = sentLink().substring(sentLink().indexOf("token=") + "token=".length());
    service.resetPassword(java.net.URLDecoder.decode(token, java.nio.charset.StandardCharsets.UTF_8),
        "a-brand-new-one-7");

    assertThat(cashier.isPasswordChangeRequired()).isFalse();
    assertThat(cashier.getPasswordHelpRequestedAt()).isNull();
    assertThat(passwords.matches("a-brand-new-one-7", cashier.getPasswordHash())).isTrue();
  }

  @Test
  @DisplayName("asking the owner for help records the request on the account")
  void helpRequestIsRecorded() {
    StaffMember cashier = member("c1", "kasun", StaffRole.CASHIER, null);
    when(staff.findByUsername("kasun")).thenReturn(Optional.of(cashier));

    Optional<StaffMember> recorded = service.requestHelp("  Kasun ");

    assertThat(recorded).contains(cashier);
    assertThat(cashier.getPasswordHelpRequestedAt()).isEqualTo(NOW);
    verify(staff).save(cashier);
  }

  @Test
  @DisplayName("an unknown username is answered with silence, not an error")
  void unknownUsernameRecordsNothing() {
    when(staff.findByUsername("nobody")).thenReturn(Optional.empty());

    assertThat(service.requestHelp("nobody")).isEmpty();
    verify(staff, never()).save(any());
  }

  @Test
  @DisplayName("a deactivated account cannot ask to be let back in")
  void deactivatedAccountRecordsNothing() {
    StaffMember former = member("c2", "former", StaffRole.CASHIER, null);
    former.setStatus(StaffStatus.INACTIVE);
    when(staff.findByUsername("former")).thenReturn(Optional.of(former));

    assertThat(service.requestHelp("former")).isEmpty();
    assertThat(former.getPasswordHelpRequestedAt()).isNull();
    verify(staff, never()).save(any());
  }

  private String sentLink() {
    ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
    verify(mailer).sendResetLink(anyString(), anyString(), link.capture(), anyLong());
    return link.getValue();
  }

  private StaffMember member(String id, String username, StaffRole role, String email) {
    return StaffMember.builder()
        .id(id)
        .username(username)
        .fullName(username)
        .email(email)
        .role(role)
        .status(StaffStatus.ACTIVE)
        .passwordHash(passwords.encode("original-password"))
        .build();
  }
}
