package lk.ranminihardware.pos.sales.service;

import java.math.BigDecimal;
import java.util.List;
import lk.ranminihardware.pos.sales.domain.TenderMethod;

/**
 * A request to complete a sale.
 *
 * <p><b>The client sends what was scanned, not what it costs.</b> There is no
 * total on this command, and no unit price on a line — only a product id and a
 * quantity. Everything monetary is recomputed here from the catalogue and the
 * shop's tax settings.
 *
 * <p>That is deliberate and it is the single most important rule in this module.
 * The browser is not a trustworthy calculator: anyone can edit the number it
 * posts, and a till that accepted a client-supplied total would let a customer
 * pay whatever they typed. The frontend still computes a total, because a
 * cashier needs to see one before pressing pay — but that figure is a preview,
 * and this service is the authority.
 */
public record CheckoutCommand(
    List<Line> lines,
    BigDecimal discountPercent,
    TenderMethod tender,
    BigDecimal amountTendered,
    String cashierId,
    String cashierName,
    String terminalName,
    /**
     * Optional client-generated key that makes a retry safe.
     *
     * <p>A till that loses the network after posting cannot tell whether the
     * sale landed. Repeating the same key returns the original sale instead of
     * charging the customer twice.
     */
    String idempotencyKey) {

  /**
   * Returns a copy carrying the given key, when the client sent it as an HTTP
   * header instead of in the body.
   */
  public CheckoutCommand withIdempotencyKey(String key) {
    return new CheckoutCommand(
        lines, discountPercent, tender, amountTendered, cashierId, cashierName, terminalName, key);
  }

  /** One scanned product and how many of it. */
  public record Line(String productId, int quantity) {}
}
