package lk.ranminihardware.pos.shared.seed;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import lk.ranminihardware.pos.staff.domain.StaffMember;
import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Creates the two administrator accounts on a fresh database.
 *
 * <p>The shop has two owners with <b>identical</b> privileges — the owner and
 * his son — so both are plain {@link StaffRole#ADMIN}. There is deliberately no
 * "super admin": a hierarchy nobody asked for is a permission check nobody can
 * explain later.
 *
 * <p>Unlike the catalogue seeder this always runs, because a system with no way
 * to sign in is not usable. It is still safe to run repeatedly: each account is
 * created only if its username is absent, so a restart never resets a password
 * the owner has since changed.
 *
 * <p><b>Passwords are never hard-coded.</b> They come from the environment, and
 * if none is supplied a strong one is generated and printed <em>once</em>, at
 * first creation, so the owner can note it and change it. Shipping a default
 * password in the repository would mean every deployment of this code shares
 * the same admin credentials.
 */
@Configuration
public class AdminSeeder {

  private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

  @Bean
  ApplicationRunner seedAdministrators(
      StaffRepository staff,
      PasswordEncoder passwords,
      @Value("${ranmini.admin.primary.username:owner}") String primaryUsername,
      @Value("${ranmini.admin.primary.name:Shop Owner}") String primaryName,
      @Value("${ranmini.admin.primary.email:owner@ranminihardware.lk}") String primaryEmail,
      @Value("${ranmini.admin.primary.password:}") String primaryPassword,
      @Value("${ranmini.admin.secondary.username:manager}") String secondaryUsername,
      @Value("${ranmini.admin.secondary.name:Assistant Owner}") String secondaryName,
      @Value("${ranmini.admin.secondary.email:manager@ranminihardware.lk}") String secondaryEmail,
      @Value("${ranmini.admin.secondary.password:}") String secondaryPassword) {

    return args -> {
      List<AdminSpec> specs =
          List.of(
              new AdminSpec(primaryUsername, primaryName, primaryEmail, primaryPassword),
              new AdminSpec(secondaryUsername, secondaryName, secondaryEmail, secondaryPassword));

      for (AdminSpec spec : specs) {
        createIfAbsent(staff, passwords, spec);
      }
    };
  }

  private void createIfAbsent(
      StaffRepository staff, PasswordEncoder passwords, AdminSpec spec) {

    String username = spec.username().trim().toLowerCase();

    if (staff.existsByUsername(username)) {
      // Nothing is overwritten. If the owner changed their password last month,
      // a redeploy must not quietly put it back to whatever is in the config.
      return;
    }

    boolean generated = spec.password() == null || spec.password().isBlank();
    String password = generated ? generatePassword() : spec.password();

    staff.save(
        StaffMember.builder()
            .fullName(spec.fullName())
            .username(username)
            .email(spec.email())
            .role(StaffRole.ADMIN)
            .status(StaffStatus.ACTIVE)
            .joinedOn(LocalDate.now())
            .passwordHash(passwords.encode(password))
            .build());

    if (generated) {
      // The only time a password is ever written to the log, and only because
      // the alternative is an account nobody can get into. Change it after the
      // first sign-in.
      log.warn(
          """

          ============================================================
           Created administrator "{}" with a GENERATED password:

               {}

           This is shown once. Sign in and change it.
           Set RANMINI_ADMIN_PRIMARY_PASSWORD to choose your own.
          ============================================================
          """,
          username,
          password);
    } else {
      log.info("Created administrator \"{}\" from configured credentials", username);
    }
  }

  /**
   * A 24-character URL-safe password from {@link SecureRandom}.
   *
   * <p>Long and random rather than memorable: it exists to be copied once and
   * replaced, so there is no reason to trade entropy for readability.
   */
  private static String generatePassword() {
    byte[] bytes = new byte[18];
    new SecureRandom().nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private record AdminSpec(String username, String fullName, String email, String password) {}
}
