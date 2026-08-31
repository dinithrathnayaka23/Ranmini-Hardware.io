package lk.ranminihardware.pos.shared.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Money arithmetic for the whole service.
 *
 * <p><b>Every monetary amount is a {@link BigDecimal}, never a double.</b> A
 * double cannot represent 0.10 exactly, so a few hundred additions of shop
 * prices drift by cents; on a till that drift shows up as a receipt total that
 * disagrees with the sum of its own lines, which is the one bug a shopkeeper
 * will never accept. Mongo stores these as {@code Decimal128}, which is exact.
 *
 * <p>Amounts are held to two decimal places and rounded HALF_UP, matching the
 * way a cashier rounds by hand.
 */
public final class Money {

  /** Sri Lankan rupee amounts carry two decimals. */
  public static final int SCALE = 2;

  public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);

  private Money() {}

  /** Normalises any amount to the canonical scale. */
  public static BigDecimal of(BigDecimal value) {
    return value == null ? ZERO : value.setScale(SCALE, RoundingMode.HALF_UP);
  }

  public static BigDecimal of(String value) {
    return of(new BigDecimal(value));
  }

  public static BigDecimal add(BigDecimal a, BigDecimal b) {
    return of(nullToZero(a).add(nullToZero(b)));
  }

  public static BigDecimal subtract(BigDecimal a, BigDecimal b) {
    return of(nullToZero(a).subtract(nullToZero(b)));
  }

  /** Line total: unit price times a whole number of units. */
  public static BigDecimal multiply(BigDecimal unitPrice, int quantity) {
    return of(nullToZero(unitPrice).multiply(BigDecimal.valueOf(quantity)));
  }

  /**
   * A percentage of an amount, e.g. a 10% discount or a 15% tax.
   *
   * Rounded to the canonical scale immediately, so the discount shown to the
   * customer is exactly the discount subtracted from the total. Deferring the
   * rounding is how a receipt ends up one cent out.
   */
  public static BigDecimal percentageOf(BigDecimal amount, BigDecimal percentage) {
    if (amount == null || percentage == null) return ZERO;
    return of(
        amount.multiply(percentage).divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP));
  }

  public static boolean isNegative(BigDecimal value) {
    return value != null && value.signum() < 0;
  }

  public static BigDecimal max(BigDecimal a, BigDecimal b) {
    return nullToZero(a).compareTo(nullToZero(b)) >= 0 ? of(a) : of(b);
  }

  private static BigDecimal nullToZero(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
