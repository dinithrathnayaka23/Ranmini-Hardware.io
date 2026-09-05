package lk.ranminihardware.pos.sales.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lk.ranminihardware.pos.catalog.api.CatalogApi;
import lk.ranminihardware.pos.catalog.api.ProductSnapshot;
import lk.ranminihardware.pos.catalog.api.StockReference;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.SaleLine;
import lk.ranminihardware.pos.sales.domain.SaleStatus;
import lk.ranminihardware.pos.sales.repository.SaleRepository;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.shared.money.Money;
import lk.ranminihardware.pos.shared.sequence.SequenceGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/**
 * Completes a sale.
 *
 * <p>This is the operation the whole service exists for, and the one place where
 * getting concurrency wrong costs the shop real money. Three rules govern it:
 *
 * <ol>
 *   <li><b>The server prices the basket.</b> The client sends product ids and
 *       quantities; every amount is recomputed here. A total supplied by a
 *       browser is a number a customer can edit.
 *   <li><b>Stock is taken one line at a time, conditionally.</b> Each line goes
 *       through the catalogue's atomic decrement, so two tills cannot both sell
 *       the last bag of cement.
 *   <li><b>A partial failure is compensated.</b> If line four has no stock,
 *       lines one to three are put back before the error is returned, so a
 *       refused sale leaves the shelf as it found it.
 * </ol>
 *
 * <p><b>On transactions.</b> MongoDB multi-document transactions would make step
 * three unnecessary, but they require a replica set, which a single-node shop
 * deployment may not have. The compensating approach works on any topology. The
 * residual risk is a crash in the gap between decrementing and compensating,
 * which would leave stock understated — recoverable from the stock ledger, and
 * far preferable to a design that cannot run on the client's hardware. If the
 * deployment is ever guaranteed to be a replica set, wrapping this method in a
 * transaction is a safe simplification.
 */
@Service
public class CheckoutService {

  private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

  /**
   * A basket larger than this is a mistake or an attack, not a hardware order.
   * Bounded so one request cannot hold a hundred stock decrements open.
   */
  private static final int MAX_LINES = 200;

  private final CatalogApi catalog;
  private final SaleRepository sales;
  private final SettingsService settings;
  private final SequenceGenerator sequences;
  private final DailySummaryService dailySummary;
  private final Clock clock;

  public CheckoutService(
      CatalogApi catalog,
      SaleRepository sales,
      SettingsService settings,
      SequenceGenerator sequences,
      DailySummaryService dailySummary,
      Clock clock) {
    this.catalog = catalog;
    this.sales = sales;
    this.settings = settings;
    this.sequences = sequences;
    this.dailySummary = dailySummary;
    this.clock = clock;
  }

  public Sale checkout(CheckoutCommand command) {
    validateShape(command);

    // A retry of a sale that already succeeded returns the original rather than
    // charging the customer again.
    if (command.idempotencyKey() != null) {
      var existing = sales.findByIdempotencyKey(command.idempotencyKey());
      if (existing.isPresent()) {
        log.info("Returning existing sale for idempotency key {}", command.idempotencyKey());
        return existing.get();
      }
    }

    Map<String, Integer> quantities = mergeDuplicateLines(command.lines());
    Map<String, ProductSnapshot> catalogued = priceBasket(quantities.keySet());

    // Costs are frozen onto the receipt now, at the moment of sale. Looking them
    // up when a report runs would mean a price change next month silently
    // rewrites last month's margin.
    Map<String, BigDecimal> costs = catalog.unitCosts(quantities.keySet());

    Instant now = Instant.now(clock);
    LocalDate businessDate = LocalDate.now(clock);
    String saleId = new org.bson.types.ObjectId().toHexString();

    // Stock is taken before the sale is written. If the write fails afterwards
    // the stock is put back, whereas the reverse order could hand a customer a
    // receipt for goods that were never deducted.
    List<SaleLine> lines = takeStock(saleId, quantities, catalogued, costs);

    try {
      Sale sale = buildSale(saleId, command, lines, now, businessDate);
      Sale saved = persist(sale, command);

      // The summary is derived data: a failure to update it must not fail a sale
      // that has already been paid for and had its stock taken.
      dailySummary.record(saved);
      return saved;

    } catch (RuntimeException ex) {
      restoreStock(saleId, lines);
      throw ex;
    }
  }

  private void validateShape(CheckoutCommand command) {
    if (command.lines() == null || command.lines().isEmpty()) {
      throw ApiException.badRequest("EMPTY_BASKET", "There is nothing to sell.");
    }
    if (command.lines().size() > MAX_LINES) {
      throw ApiException.badRequest(
          "BASKET_TOO_LARGE", "A single sale cannot have more than %d lines.".formatted(MAX_LINES));
    }
    for (CheckoutCommand.Line line : command.lines()) {
      if (line.quantity() <= 0) {
        throw ApiException.badRequest("INVALID_QUANTITY", "Every line needs a quantity of at least one.");
      }
    }
  }

  /**
   * Collapses a product added twice into one line.
   *
   * <p>A cashier adding the same item twice means two units, not two lines —
   * and more importantly, two separate decrements of one unit each could
   * interleave with another till in a way a single decrement of two cannot.
   */
  private Map<String, Integer> mergeDuplicateLines(List<CheckoutCommand.Line> lines) {
    Map<String, Integer> merged = new LinkedHashMap<>();
    for (CheckoutCommand.Line line : lines) {
      merged.merge(line.productId(), line.quantity(), Integer::sum);
    }
    return merged;
  }

  /** One batch read for the whole basket, rather than a lookup per line. */
  private Map<String, ProductSnapshot> priceBasket(Iterable<String> productIds) {
    List<String> ids = new ArrayList<>();
    productIds.forEach(ids::add);

    Map<String, ProductSnapshot> byId = new HashMap<>();
    catalog.findSellable(ids).forEach(p -> byId.put(p.id(), p));

    for (String id : ids) {
      if (!byId.containsKey(id)) {
        throw ApiException.unprocessable(
            "PRODUCT_UNAVAILABLE", "One of the items is no longer available for sale.");
      }
    }
    return byId;
  }

  /**
   * Takes stock for every line, compensating if any line cannot be satisfied.
   *
   * @return the sale lines, priced from the catalogue
   */
  private List<SaleLine> takeStock(
      String saleId,
      Map<String, Integer> quantities,
      Map<String, ProductSnapshot> catalogued,
      Map<String, BigDecimal> costs) {

    List<SaleLine> lines = new ArrayList<>(quantities.size());
    StockReference reference = StockReference.forSale(saleId);

    for (Map.Entry<String, Integer> entry : quantities.entrySet()) {
      String productId = entry.getKey();
      int quantity = entry.getValue();
      ProductSnapshot product = catalogued.get(productId);

      if (catalog.reserveStock(productId, quantity, reference).isEmpty()) {
        // Put back whatever this sale already took before refusing it.
        restoreStock(saleId, lines);
        throw ApiException.unprocessable(
            "INSUFFICIENT_STOCK",
            "There is not enough %s in stock to complete this sale.".formatted(product.name()));
      }

      lines.add(toLine(product, quantity, costs.get(productId)));
    }
    return lines;
  }

  /**
   * Puts back the stock this sale took.
   *
   * <p>Best effort by necessity: it runs while another failure is already being
   * handled, so a further exception must not mask the original. Anything that
   * fails here is logged with everything needed to correct it by hand, and the
   * stock ledger records what actually happened either way.
   */
  private void restoreStock(String saleId, List<SaleLine> lines) {
    StockReference reference = StockReference.forVoid(saleId);
    for (SaleLine line : lines) {
      try {
        catalog.releaseStock(line.getProductId(), line.getQuantity(), reference);
      } catch (RuntimeException ex) {
        log.error(
            "Could not return stock after a failed sale. Correct by hand: "
                + "sale={} product={} sku={} quantity={}",
            saleId,
            line.getProductId(),
            line.getSku(),
            line.getQuantity(),
            ex);
      }
    }
  }

  private SaleLine toLine(ProductSnapshot product, int quantity, BigDecimal unitCost) {
    BigDecimal unitPrice = Money.of(product.sellingPrice());

    // A product with no recorded cost is sold anyway and simply reports zero
    // margin. Refusing the sale would punish the customer for a bookkeeping gap.
    BigDecimal cost = Money.of(unitCost);

    return SaleLine.builder()
        .productId(product.id())
        .sku(product.sku())
        .name(product.name())
        .categoryId(product.categoryId())
        .categoryName(product.categoryName())
        .unitPrice(unitPrice)
        .quantity(quantity)
        .lineTotal(Money.multiply(unitPrice, quantity))
        .unitCost(cost)
        .lineCost(Money.multiply(cost, quantity))
        .build();
  }

  /**
   * Computes every monetary figure on the receipt.
   *
   * <p>Order matters and is fixed here: discount comes off the subtotal, then
   * tax is charged on the discounted amount. Taxing before discounting would
   * overcharge the customer, and the two orders differ by real money on a large
   * order.
   */
  private Sale buildSale(
      String saleId,
      CheckoutCommand command,
      List<SaleLine> lines,
      Instant now,
      LocalDate businessDate) {

    BigDecimal subtotal = Money.ZERO;
    BigDecimal costTotal = Money.ZERO;
    for (SaleLine line : lines) {
      subtotal = Money.add(subtotal, line.getLineTotal());
      costTotal = Money.add(costTotal, line.getLineCost());
    }

    BigDecimal discountPercent = clampPercent(command.discountPercent());
    BigDecimal discountAmount = Money.percentageOf(subtotal, discountPercent);
    BigDecimal discounted = Money.subtract(subtotal, discountAmount);

    BigDecimal taxRate = settings.taxRate();
    BigDecimal taxAmount = Money.percentageOf(discounted, taxRate);
    BigDecimal total = Money.add(discounted, taxAmount);

    BigDecimal tendered = command.amountTendered();
    BigDecimal change = Money.ZERO;
    if (tendered != null) {
      if (tendered.compareTo(total) < 0) {
        throw ApiException.badRequest(
            "INSUFFICIENT_TENDER", "The amount tendered is less than the total.");
      }
      change = Money.subtract(tendered, total);
    }

    return Sale.builder()
        .id(saleId)
        .invoiceNumber(nextInvoiceNumber(businessDate))
        .businessDate(businessDate.toString())
        .soldAt(now)
        .cashierId(command.cashierId())
        .cashierName(command.cashierName())
        .terminalName(command.terminalName())
        .lines(lines)
        .subtotal(subtotal)
        .discountPercent(discountPercent)
        .discountAmount(discountAmount)
        .taxRate(taxRate)
        .taxAmount(taxAmount)
        .total(total)
        .costTotal(costTotal)
        // Tax is collected on behalf of the state, so it is not profit.
        .profit(Money.subtract(Money.subtract(total, taxAmount), costTotal))
        .tender(command.tender())
        .amountTendered(tendered == null ? null : Money.of(tendered))
        .changeDue(change)
        .status(SaleStatus.COMPLETED)
        .idempotencyKey(command.idempotencyKey())
        .build();
  }

  /**
   * Persists the sale, treating a duplicate idempotency key as a success.
   *
   * <p>Two identical retries can arrive close enough together that both pass the
   * lookup at the top of {@code checkout}. The unique index is what actually
   * settles it: the loser is told the key exists, and answers with the sale the
   * winner wrote.
   */
  private Sale persist(Sale sale, CheckoutCommand command) {
    try {
      return sales.save(sale);
    } catch (DuplicateKeyException ex) {
      if (command.idempotencyKey() == null) throw ex;

      return sales
          .findByIdempotencyKey(command.idempotencyKey())
          .orElseThrow(() -> ex);
    }
  }

  /**
   * Builds the next receipt number, e.g. "INV-20260831-0042".
   *
   * <p>Counters are per day so each stays small and the number tells a
   * shopkeeper when the sale happened without a lookup.
   */
  private String nextInvoiceNumber(LocalDate businessDate) {
    String datePart = businessDate.toString().replace("-", "");
    long sequence = sequences.next("invoice:" + businessDate);
    return "%s-%s-%04d".formatted(settings.receiptPrefix(), datePart, sequence);
  }

  private BigDecimal clampPercent(BigDecimal value) {
    if (value == null) return Money.ZERO;
    if (value.signum() < 0) return Money.ZERO;
    return value.min(BigDecimal.valueOf(100));
  }
}
