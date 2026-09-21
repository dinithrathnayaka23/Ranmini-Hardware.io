package lk.ranminihardware.pos.shared.seed;

import lk.ranminihardware.pos.staff.domain.StaffRole;
import lk.ranminihardware.pos.staff.domain.StaffStatus;
import lk.ranminihardware.pos.staff.repository.StaffRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Says at startup when nobody can sign in at the till.
 *
 * <p><b>Why this is worth a startup check.</b> {@link AdminSeeder} creates the
 * two owner accounts on a fresh database, and nothing creates a cashier — the
 * demonstration one in {@link DevelopmentSeeder} exists only while seeding is
 * switched on, and it is skipped entirely once the catalogue has products in
 * it. So a perfectly healthy deployment can reach the point where the till is
 * unusable, and the only symptom is the sign-in form answering "Invalid
 * username or password" for every attempt.
 *
 * <p>That message is deliberate and stays as it is: {@code AuthService} refuses
 * to disclose whether a username exists, because telling an anonymous caller
 * apart from a real one is half of a credential-stuffing run. But the person
 * running the service is not anonymous, and they are entitled to know that the
 * reason nothing works is that there is nothing to sign in as. This is that
 * message, in the one place where saying it costs no secrecy at all — the
 * service's own log.
 *
 * <p>It creates nothing. A default till password shipped in the repository
 * would be a working counter login shared by every deployment of this code,
 * which is a worse problem than the one it solves. The cure is a named account,
 * added by an owner from Staff in the management portal, with a password they
 * choose and hand over in person.
 */
@Configuration
public class TillAccountCheck {

  private static final Logger log = LoggerFactory.getLogger(TillAccountCheck.class);

  @Bean
  ApplicationRunner warnWhenNoCashierCanSignIn(StaffRepository staff) {
    // Runs once, against a collection holding a shop's worth of staff — a dozen
    // documents at the very most — so this needs no index of its own.
    return args -> {
      if (staff.existsByRoleAndStatus(StaffRole.CASHIER, StaffStatus.ACTIVE)) {
        return;
      }

      log.warn(
          """

          ============================================================
           No ACTIVE cashier account exists.

           The till at /cashier/pos cannot be signed into: every
           attempt will be refused as "Invalid username or password",
           because there is no cashier to match. An administrator's
           credentials will not work there either — the two portals
           are deliberately kept apart.

           Fix: sign in to the management portal as an owner, open
           Staff, and add a cashier with a password of your choosing.
          ============================================================
          """);
    };
  }
}
