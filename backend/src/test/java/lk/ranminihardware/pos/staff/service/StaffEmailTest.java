package lk.ranminihardware.pos.staff.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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

/**
 * Email addresses on staff accounts, as an administrator sets them.
 *
 * <p>An address is what lets a cashier recover a forgotten password by email,
 * so the admin forms now collect one. These pin the two ways that could go
 * wrong: a blank field stored as an empty string, which the unique index then
 * refuses for the second account without an address, and a clash with another
 * account reported as a generic error instead of a readable one.
 */
class StaffEmailTest {

  private final StaffRepository repository = mock(StaffRepository.class);
  private final SettingsService settings = mock(SettingsService.class);
  private StaffService service;

  @BeforeEach
  void setUp() {
    when(settings.get()).thenReturn(ShopSettings.defaults());
    when(repository.save(any(StaffMember.class))).thenAnswer(call -> call.getArgument(0));
    service =
        new StaffService(
            repository,
            settings,
            new BCryptPasswordEncoder(4),
            Clock.fixed(Instant.parse("2026-09-26T04:00:00Z"), ZoneOffset.UTC));
  }

  @Test
  @DisplayName("a blank email on a new account is stored as no email at all")
  void blankEmailBecomesNull() {
    StaffMember saved = service.create(write("   "), "InitialPass1");

    assertThat(saved.getEmail()).isNull();
  }

  @Test
  @DisplayName("an email on a new account is kept, trimmed")
  void emailIsTrimmed() {
    StaffMember saved = service.create(write("  nemina@example.com "), "InitialPass1");

    assertThat(saved.getEmail()).isEqualTo("nemina@example.com");
  }

  @Test
  @DisplayName("adding another account's email is refused with a readable message")
  void updateRefusesSomeoneElsesEmail() {
    when(repository.findById("c1")).thenReturn(Optional.of(existing("c1", null)));
    when(repository.existsByEmailIgnoreCase("owner@example.com")).thenReturn(true);

    assertThatThrownBy(() -> service.update("c1", write("owner@example.com")))
        .isInstanceOfSatisfying(
            ApiException.class, ex -> assertThat(ex.getCode()).isEqualTo("EMAIL_TAKEN"));
  }

  @Test
  @DisplayName("re-saving an account with its own email is not a clash")
  void updateKeepsOwnEmail() {
    when(repository.findById("c1")).thenReturn(Optional.of(existing("c1", "Nemina@Example.com")));
    when(repository.existsByEmailIgnoreCase("nemina@example.com")).thenReturn(true);

    StaffMember saved = service.update("c1", write("nemina@example.com"));

    assertThat(saved.getEmail()).isEqualTo("nemina@example.com");
  }

  @Test
  @DisplayName("clearing an email removes it rather than storing an empty string")
  void clearingEmailStoresNull() {
    when(repository.findById("c1")).thenReturn(Optional.of(existing("c1", "nemina@example.com")));

    StaffMember saved = service.update("c1", write(""));

    assertThat(saved.getEmail()).isNull();
  }

  private static StaffService.StaffWrite write(String email) {
    return new StaffService.StaffWrite(
        "Nemina Rathnayaka", "nemina2003", email, null, StaffRole.CASHIER, null);
  }

  private static StaffMember existing(String id, String email) {
    return StaffMember.builder()
        .id(id)
        .fullName("Nemina Rathnayaka")
        .username("nemina2003")
        .email(email)
        .role(StaffRole.CASHIER)
        .build();
  }
}
