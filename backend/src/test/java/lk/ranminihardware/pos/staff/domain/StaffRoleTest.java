package lk.ranminihardware.pos.staff.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Which door each role may open.
 *
 * <p>Cheap tests of two one-line methods, and they earn their place because of
 * what those two lines decide. {@code AuthService} asks this enum and nothing
 * else, so every sign-in in the system turns on the four answers below — and
 * the failure they guard against is one somebody would introduce on purpose,
 * believing it to be a convenience.
 *
 * <p>The shop ran for a while with {@code canUseTill()} returning true for
 * everyone, so the owner could cover the counter without a second account. That
 * was deliberate and it was later withdrawn: with it, a sale rung up by the
 * owner is indistinguishable from one rung up by the cashier, and an owner who
 * leaves the portal signed in on the counter machine exposes the whole business
 * to whoever walks past it. These tests exist so that reasoning has to be
 * argued with rather than quietly reverted.
 */
class StaffRoleTest {

  @Test
  @DisplayName("an administrator may use the portal and may not use the till")
  void administratorIsPortalOnly() {
    assertThat(StaffRole.ADMIN.canUseAdminPortal()).isTrue();
    assertThat(StaffRole.ADMIN.canUseTill()).isFalse();
  }

  @Test
  @DisplayName("a cashier may use the till and may not use the portal")
  void cashierIsTillOnly() {
    assertThat(StaffRole.CASHIER.canUseTill()).isTrue();
    assertThat(StaffRole.CASHIER.canUseAdminPortal()).isFalse();
  }

  @Test
  @DisplayName("every role has exactly one door, so neither is left with none")
  void everyRoleOpensExactlyOneDoor() {
    // Written over the whole enum rather than the two constants above, so a
    // third role added later fails here until somebody decides what it may
    // reach. A role that opens both doors defeats the separation; one that
    // opens neither is an account nobody can sign in to, which would be found
    // by the person holding it rather than by a test.
    for (StaffRole role : StaffRole.values()) {
      int doors = (role.canUseAdminPortal() ? 1 : 0) + (role.canUseTill() ? 1 : 0);

      assertThat(doors)
          .as("%s should open exactly one of the two portals", role)
          .isEqualTo(1);
    }
  }
}
