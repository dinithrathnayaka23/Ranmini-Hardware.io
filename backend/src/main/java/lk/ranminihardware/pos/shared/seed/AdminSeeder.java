package lk.ranminihardware.pos.shared.seed;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
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
 * Creates the shop owner's administrator account on a fresh database.
 *
 * <p>Unlike the catalogue seeder this always runs, because a system with no way
 * to sign in is not usable. It is still safe to run repeatedly: the account is
 * created only if its username is absent, so a restart never resets a password
 * the owner has since changed.
 *
 * <p><b>The password is never hard-coded.</b> It comes from the environment, and
 * if none is supplied a strong one is generated and printed <em>once</em>, at
 * first creation, so the owner can note it and change it. Shipping a default
 * password in the repository would mean every deployment of this code shares
 * the same admin credentials.
 */
@Configuration
public class AdminSeeder {

  private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

  @Bean
  ApplicationRunner seedAdministrator(
      StaffRepository staff,
      PasswordEncoder passwords,
      @Value("${ranmini.admin.username:owner}") String username,
      @Value("${ranmini.admin.name:Shop Owner}") String fullName,
      @Value("${ranmini.admin.email:owner@ranminihardware.lk}") String email,
      @Value("${ranmini.admin.password:}") String password) {

    return args -> createIfAbsent(staff, passwords, username, fullName, email, password);
  }

  private void createIfAbsent(
      StaffRepository staff,
      PasswordEncoder passwords,
      String rawUsername,
      String fullName,
      String email,
      String configuredPassword) {

    String username = rawUsername.trim().toLowerCase();

    if (staff.existsByUsername(username)) {
      // Nothing is overwritten. If the owner changed their password last month,
      // a redeploy must not quietly put it back to whatever is in the config.
      return;
    }

    boolean generated = configuredPassword == null || configuredPassword.isBlank();
    String password = generated ? generatePassword() : configuredPassword;

    staff.save(
        StaffMember.builder()
            .fullName(fullName)
            .username(username)
            .email(email)
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
           Set RANMINI_ADMIN_PASSWORD to choose your own.
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
}
