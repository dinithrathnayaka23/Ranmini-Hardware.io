package lk.ranminihardware.pos.sales.service;

import java.util.List;
import lk.ranminihardware.pos.sales.domain.Sale;

/**
 * What a completed checkout hands back: the sale, and anything the cashier
 * should be told about the shelf because of it.
 *
 * <p>The notices are deliberately <b>not</b> stored on the {@link Sale}. They
 * describe the catalogue at one instant, not the transaction — reprinting a
 * receipt from last Tuesday should not announce that something was running low
 * that has been restocked twice since. A sale is a permanent record; this is a
 * message for the person at the counter right now.
 *
 * @param notices empty on an idempotent replay, since the stock moved once and
 *     was announced once. A till retrying after a dropped connection must not
 *     warn the cashier a second time about a threshold that was crossed by the
 *     request it is retrying.
 */
public record CheckoutOutcome(Sale sale, List<StockNotice> notices) {

  public static CheckoutOutcome of(Sale sale, List<StockNotice> notices) {
    return new CheckoutOutcome(sale, List.copyOf(notices));
  }

  /** A sale that told us nothing new about stock — the ordinary case. */
  public static CheckoutOutcome quiet(Sale sale) {
    return new CheckoutOutcome(sale, List.of());
  }
}
