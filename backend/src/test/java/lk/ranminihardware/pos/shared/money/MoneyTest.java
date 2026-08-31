package lk.ranminihardware.pos.shared.money;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The arithmetic every receipt depends on.
 *
 * These are cheap tests of a small class, and they earn their place because the
 * failure they guard against is invisible: a total that is one cent out looks
 * fine until a customer adds up their own receipt.
 */
class MoneyTest {

  @Test
  @DisplayName("adding shop prices repeatedly does not drift, the way doubles do")
  void additionDoesNotDrift() {
    BigDecimal running = Money.ZERO;
    for (int i = 0; i < 1000; i++) {
      running = Money.add(running, Money.of("0.10"));
    }

    // The same loop with a double lands on 99.99999999999859.
    assertThat(running).isEqualByComparingTo("100.00");
  }

  @Test
  @DisplayName("a line total is the unit price times the quantity, exactly")
  void lineTotalIsExact() {
    assertThat(Money.multiply(Money.of("2450.00"), 3)).isEqualByComparingTo("7350.00");
    assertThat(Money.multiply(Money.of("0.05"), 3)).isEqualByComparingTo("0.15");
  }

  @Test
  @DisplayName("a percentage is rounded immediately, so the parts reconcile")
  void percentageReconciles() {
    BigDecimal subtotal = Money.of("4950.00");
    BigDecimal discount = Money.percentageOf(subtotal, new BigDecimal("10"));
    BigDecimal discounted = Money.subtract(subtotal, discount);

    assertThat(discount).isEqualByComparingTo("495.00");
    assertThat(discounted).isEqualByComparingTo("4455.00");

    // Tax is charged on the discounted amount, never on the original: the two
    // orders differ by real money, and taxing first overcharges the customer.
    BigDecimal tax = Money.percentageOf(discounted, new BigDecimal("15"));
    assertThat(tax).isEqualByComparingTo("668.25");
    assertThat(Money.add(discounted, tax)).isEqualByComparingTo("5123.25");
  }

  @Test
  @DisplayName("a third of a rupee rounds half up, the way a cashier would")
  void roundsHalfUp() {
    assertThat(Money.percentageOf(Money.of("10.00"), new BigDecimal("33.335")))
        .isEqualByComparingTo("3.33");
    assertThat(Money.of(new BigDecimal("2.345"))).isEqualByComparingTo("2.35");
  }

  @Test
  @DisplayName("nulls are treated as zero rather than exploding mid-sale")
  void nullsAreZero() {
    assertThat(Money.add(null, null)).isEqualByComparingTo("0.00");
    assertThat(Money.multiply(null, 5)).isEqualByComparingTo("0.00");
    assertThat(Money.percentageOf(null, new BigDecimal("10"))).isEqualByComparingTo("0.00");
    assertThat(Money.of((BigDecimal) null)).isEqualByComparingTo("0.00");
  }

  @Test
  @DisplayName("negative amounts are recognised, so a negative price is refused")
  void detectsNegative() {
    assertThat(Money.isNegative(Money.of("-0.01"))).isTrue();
    assertThat(Money.isNegative(Money.ZERO)).isFalse();
    assertThat(Money.isNegative(null)).isFalse();
  }
}
