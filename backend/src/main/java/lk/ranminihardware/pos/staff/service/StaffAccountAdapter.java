package lk.ranminihardware.pos.staff.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.staff.api.StaffAccount;
import lk.ranminihardware.pos.staff.api.StaffAccountApi;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * The staff module side of the authentication boundary.
 *
 * Owns the lockout policy, because the failure count belongs to the account and
 * the threshold is a shop setting. Keeping it here rather than in the auth
 * module means there is one place that decides when someone is locked out.
 */
@Service
public class StaffAccountAdapter implements StaffAccountApi {

  private static final Logger log = LoggerFactory.getLogger(StaffAccountAdapter.class);

  /**
   * How long an account stays locked once the threshold is hit.
   *
   * Fifteen minutes rather than forever: a genuine cashier who mistyped their
   * password three times before their shift should not need the owner to come in
   * and unlock them, while an attacker guessing passwords is slowed to a crawl.
   */
  private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

  private final StaffRepository staff;
  private final SettingsService settings;
  private final Clock clock;
  private final StaffService staffService;

  public StaffAccountAdapter(
      StaffRepository staff, SettingsService settings, Clock clock, StaffService staffService) {
    this.staff = staff;
    this.settings = settings;
    this.clock = clock;
    this.staffService = staffService;
  }

  @Override
  public Optional<StaffAccount> findForAuthentication(String username) {
    if (username == null || username.isBlank()) return Optional.empty();
    return staff.findByUsername(username.trim().toLowerCase()).map(StaffAccountAdapter::toAccount);
  }

  @Override
  public void recordFailedLogin(String staffId) {
    staff
        .findById(staffId)
        .ifPresent(
            member -> {
              int attempts = member.getFailedLoginAttempts() + 1;
              member.setFailedLoginAttempts(attempts);

              int threshold = settings.get().getSecurity().getLockoutThreshold();
              if (attempts >= threshold) {
                member.setLockedUntil(Instant.now(clock).plus(LOCKOUT_DURATION));
                log.warn(
                    "Locked account {} after {} failed sign-in attempts",
                    member.getUsername(),
                    attempts);
              }
              staff.save(member);
            });
  }

  @Override
  public void recordSuccessfulLogin(String staffId) {
    staff
        .findById(staffId)
        .ifPresent(
            member -> {
              member.setFailedLoginAttempts(0);
              member.setLockedUntil(null);
              member.setLastActiveAt(Instant.now(clock));
              staff.save(member);
            });
  }

  @Override
  public StaffAccount chooseOwnPassword(String staffId, String rawPassword) {
    return toAccount(staffService.chooseOwnPassword(staffId, rawPassword));
  }

  private static StaffAccount toAccount(StaffMember member) {
    return new StaffAccount(
        member.getId(),
        member.getUsername(),
        member.getFullName(),
        member.getEmail(),
        member.getRole(),
        member.getStatus(),
        member.getPasswordHash(),
        member.getLockedUntil(),
        member.getAvatarVersion(),
        member.isPasswordChangeRequired());
  }
}
