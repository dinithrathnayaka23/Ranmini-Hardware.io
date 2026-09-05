package lk.ranminihardware.pos.shared.seed;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.SaleLine;
import lk.ranminihardware.pos.sales.domain.SaleStatus;
import lk.ranminihardware.pos.sales.domain.TenderMethod;
import lk.ranminihardware.pos.sales.repository.SaleRepository;
import lk.ranminihardware.pos.sales.service.DailySummaryService;
import lk.ranminihardware.pos.settings.service.SettingsService;
import lk.ranminihardware.pos.shared.money.Money;
import lk.ranminihardware.pos.shared.sequence.SequenceGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Writes a plausible trading history behind the demonstration catalogue.
 *
 * <p>Without it the dashboard and the reports open on a shop that has never sold
 * anything: empty charts, zero everywhere, and no way to tell a working screen
 * from a broken one. Ninety days of sales makes every screen show what it is
 * actually for — a revenue trend with a shape, a best-sellers list with an
 * order, a category breakdown with a tail.
 *
 * <p><b>The history is reproducible.</b> The generator is seeded with a fixed
 * value, so two developers running this get identical figures and a screenshot
 * in a bug report means the same thing on both machines.
 *
 * <p>Three deliberate choices about realism:
 *
 * <ul>
 *   <li><b>Sundays are quiet and Saturdays busy.</b> A flat distribution makes a
 *       revenue chart a straight line, which is exactly the shape that hides a
 *       broken axis.
 *   <li><b>Products sell at different rates.</b> Cement and PVC pipe move every
 *       day; a circular saw does not. Equal popularity would make the
 *       best-sellers list meaningless and the category breakdown uniform.
 *   <li><b>A handful of sales are voided.</b> The void is a real state with real
 *       consequences — it reverses the day's takings and raises a notification —
 *       and a demo where it never happens leaves that path untested.
 * </ul>
 *
 * <p><b>Seeded sales do not move stock.</b> The stock levels in the fixture are
 * the shelf as it stands today, not as it stood ninety days ago, so replaying
 * this history against them would drive half the catalogue negative. The trade
 * is that the stock ledger has no entries for these sales, which is the honest
 * shape of made-up data: the sales are fictional, and the shelf is the starting
 * point the shop is being handed.
 */
@Component
@ConditionalOnProperty(name = "ranmini.seed.enabled", havingValue = "true")
public class SalesHistorySeeder {

  private static final Logger log = LoggerFactory.getLogger(SalesHistorySeeder.class);

  /** Fixed, so the demonstration data is the same on every machine. */
  private static final long RANDOM_SEED = 20260903L;

  private static final int DAYS_OF_HISTORY = 90;

  /** Sales on an ordinary weekday, before the weekday multiplier. */
  private static final int BASE_SALES_PER_DAY = 11;

  /** Trading hours, so a receipt timestamp is never three in the morning. */
  private static final LocalTime OPENS = LocalTime.of(8, 0);

  private static final LocalTime CLOSES = LocalTime.of(18, 30);

  /** Roughly one sale in sixty is cancelled — enough to see, rare enough to be plausible. */
  private static final int VOID_ODDS = 60;

  private final SaleRepository sales;
  private final DailySummaryService dailySummary;
  private final SettingsService settings;
  private final SequenceGenerator sequences;
  private final Clock clock;

  public SalesHistorySeeder(
      SaleRepository sales,
      DailySummaryService dailySummary,
      SettingsService settings,
      SequenceGenerator sequences,
      Clock clock) {
    this.sales = sales;
    this.dailySummary = dailySummary;
    this.settings = settings;
    this.sequences = sequences;
    this.clock = clock;
  }

  /**
   * Generates the history.
   *
   * @param catalogue the products to sell, already saved
   * @param cashiers who rang the sales up — a receipt with no cashier is a
   *     receipt that cannot answer the question the sales ledger exists for
   */
  public void seed(List<Product> catalogue, List<Cashier> cashiers) {
    if (catalogue.isEmpty() || cashiers.isEmpty()) return;

    Random random = new Random(RANDOM_SEED);
    List<Product> weighted = weightByPopularity(catalogue);

    LocalDate today = LocalDate.now(clock);
    LocalDate day = today.minusDays(DAYS_OF_HISTORY - 1L);

    int written = 0;
    int voided = 0;

    while (!day.isAfter(today)) {
      int count = salesFor(day, random);

      for (int i = 0; i < count; i++) {
        Sale sale = buildSale(day, weighted, cashiers, random);
        Sale saved = sales.save(sale);
        dailySummary.record(saved);
        written++;

        if (random.nextInt(VOID_ODDS) == 0) {
          voidSale(saved, random);
          voided++;
        }
      }
      day = day.plusDays(1);
    }

    log.info(
        "Seeded {} sales across {} days ({} of them voided)", written, DAYS_OF_HISTORY, voided);
  }

  /** A cashier the seeded receipts are attributed to. */
  public record Cashier(String id, String name) {}

  /**
   * How busy a day was.
   *
   * <p>The weekday shape matters more than the exact figures: a hardware shop is
   * busiest on Saturday when people do their own jobs, and nearly closed on
   * Sunday. The small upward drift over the ninety days gives the trend chart
   * something to show beyond noise.
   */
  private int salesFor(LocalDate day, Random random) {
    double weekday =
        switch (day.getDayOfWeek()) {
          case SUNDAY -> 0.3;
          case SATURDAY -> 1.5;
          case FRIDAY -> 1.15;
          default -> 1.0;
        };

    double drift = 1.0 + (DAYS_OF_HISTORY - daysUntilToday(day)) * 0.002;
    double noise = 0.75 + random.nextDouble() * 0.5;

    return Math.max(1, (int) Math.round(BASE_SALES_PER_DAY * weekday * drift * noise));
  }

  private long daysUntilToday(LocalDate day) {
    return java.time.temporal.ChronoUnit.DAYS.between(day, LocalDate.now(clock));
  }

  /**
   * Builds one receipt.
   *
   * <p>The arithmetic mirrors {@code CheckoutService} exactly — discount off the
   * subtotal, then tax on the discounted amount, profit as total less tax less
   * cost. It is duplicated rather than reused because checkout also takes stock,
   * writes a ledger entry and stamps the current time, none of which a
   * backdated fixture wants. Both use the same {@code Money} helpers, so the
   * rounding cannot diverge.
   */
  private Sale buildSale(
      LocalDate day, List<Product> weighted, List<Cashier> cashiers, Random random) {

    List<SaleLine> lines = buildLines(weighted, random);

    BigDecimal subtotal = Money.ZERO;
    BigDecimal costTotal = Money.ZERO;
    for (SaleLine line : lines) {
      subtotal = Money.add(subtotal, line.getLineTotal());
      costTotal = Money.add(costTotal, line.getLineCost());
    }

    // Most sales carry no discount; a few carry the round numbers a shopkeeper
    // actually gives — five or ten per cent off a large order.
    BigDecimal discountPercent =
        switch (random.nextInt(10)) {
          case 0 -> BigDecimal.valueOf(10);
          case 1, 2 -> BigDecimal.valueOf(5);
          default -> Money.ZERO;
        };

    BigDecimal discountAmount = Money.percentageOf(subtotal, discountPercent);
    BigDecimal discounted = Money.subtract(subtotal, discountAmount);

    BigDecimal taxRate = settings.taxRate();
    BigDecimal taxAmount = Money.percentageOf(discounted, taxRate);
    BigDecimal total = Money.add(discounted, taxAmount);

    TenderMethod tender = random.nextInt(4) == 0 ? TenderMethod.CARD : TenderMethod.CASH;
    BigDecimal tendered = tender == TenderMethod.CASH ? roundedUpNote(total) : null;

    Cashier cashier = cashiers.get(random.nextInt(cashiers.size()));

    return Sale.builder()
        .invoiceNumber(invoiceNumber(day))
        .businessDate(day.toString())
        .soldAt(timeOfDay(day, random))
        .cashierId(cashier.id())
        .cashierName(cashier.name())
        .terminalName("Counter 1")
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
        .tender(tender)
        .amountTendered(tendered)
        .changeDue(tendered == null ? Money.ZERO : Money.subtract(tendered, total))
        .status(SaleStatus.COMPLETED)
        .build();
  }

  /** One to four distinct products, in the quantities that product sells in. */
  private List<SaleLine> buildLines(List<Product> weighted, Random random) {
    int lineCount = 1 + random.nextInt(4);
    List<SaleLine> lines = new ArrayList<>(lineCount);
    List<String> used = new ArrayList<>(lineCount);

    for (int i = 0; i < lineCount; i++) {
      Product product = weighted.get(random.nextInt(weighted.size()));

      // A product added twice is one line with two units, not two lines.
      if (used.contains(product.getId())) continue;
      used.add(product.getId());

      int quantity = quantityFor(product, random);
      BigDecimal unitPrice = Money.of(product.getSellingPrice());
      BigDecimal unitCost = Money.of(product.getBuyingPrice());

      lines.add(
          SaleLine.builder()
              .productId(product.getId())
              .sku(product.getSku())
              .name(product.getName())
              .categoryId(product.getCategoryId())
              .categoryName(product.getCategoryName())
              .unitPrice(unitPrice)
              .quantity(quantity)
              .lineTotal(Money.multiply(unitPrice, quantity))
              .unitCost(unitCost)
              .lineCost(Money.multiply(unitCost, quantity))
              .build());
    }

    return lines;
  }

  /**
   * How many of a thing somebody buys at once.
   *
   * <p>Scaled by price, because that is what actually governs it: nobody buys
   * forty water tanks, and nobody buys one nail. Without this the revenue
   * figures come out wrong by an order of magnitude at both ends.
   */
  private int quantityFor(Product product, Random random) {
    BigDecimal price = product.getSellingPrice();

    if (price.compareTo(BigDecimal.valueOf(10_000)) >= 0) return 1;
    if (price.compareTo(BigDecimal.valueOf(2_000)) >= 0) return 1 + random.nextInt(2);
    if (price.compareTo(BigDecimal.valueOf(500)) >= 0) return 1 + random.nextInt(4);
    return 2 + random.nextInt(9);
  }

  /**
   * Repeats each product according to how often it sells.
   *
   * <p>A weighted list drawn from uniformly is simpler than a cumulative
   * distribution and, at these sizes, costs nothing: fifty products expand to a
   * few hundred entries.
   */
  private List<Product> weightByPopularity(List<Product> catalogue) {
    // Popularity is not on the product document — it is a property of the
    // demonstration, not of the shop — so it is recovered from the fixture by
    // SKU, indexed once rather than scanned per product.
    Map<String, Integer> weights = new HashMap<>();
    CatalogueFixture.products()
        .forEach(spec -> weights.put(spec.sku(), spec.popularity()));

    List<Product> weighted = new ArrayList<>();
    for (Product product : catalogue) {
      int weight = weights.getOrDefault(product.getSku(), 3);
      for (int i = 0; i < weight; i++) {
        weighted.add(product);
      }
    }
    return weighted;
  }

  /**
   * Cancels a seeded sale, exactly as the void endpoint would.
   *
   * <p>Including the reversal of the day's totals: a voided sale that still
   * counted towards revenue would make the seeded reports disagree with the
   * seeded receipts, which is precisely the bug this data exists to reveal.
   */
  private void voidSale(Sale sale, Random random) {
    String[] reasons = {
      "Customer changed their mind at the counter.",
      "Wrong item rung up — entered again correctly.",
      "Duplicate receipt, cancelled by the owner.",
      "Payment failed after the receipt printed."
    };

    sale.setStatus(SaleStatus.VOIDED);
    // A void happens minutes after the sale, not days later.
    sale.setVoidedAt(sale.getSoldAt().plusSeconds(120L + random.nextInt(1_800)));
    sale.setVoidReason(reasons[random.nextInt(reasons.length)]);

    dailySummary.reverse(sales.save(sale));
  }

  /** A receipt number in the same format the till produces. */
  private String invoiceNumber(LocalDate day) {
    return "%s-%s-%04d"
        .formatted(
            settings.receiptPrefix(), day.toString().replace("-", ""), sequences.next("invoice:" + day));
  }

  /** A time within trading hours, weighted towards the middle of the day. */
  private Instant timeOfDay(LocalDate day, Random random) {
    int openSeconds = OPENS.toSecondOfDay();
    int span = CLOSES.toSecondOfDay() - openSeconds;

    // Two draws averaged: a rough bell, so receipts cluster around midday the
    // way a shop's takings actually do, instead of spreading evenly.
    int offset = (random.nextInt(span) + random.nextInt(span)) / 2;

    return day.atStartOfDay(clock.getZone()).plusSeconds(openSeconds + offset).toInstant();
  }

  /**
   * What a customer hands over in cash.
   *
   * <p>Rounded up to the next hundred rupees, so the change due on a seeded
   * receipt is a figure a real till would print rather than an exact payment
   * nobody ever makes.
   */
  private BigDecimal roundedUpNote(BigDecimal total) {
    BigDecimal hundred = BigDecimal.valueOf(100);
    return Money.of(
        total.divide(hundred, 0, java.math.RoundingMode.CEILING).multiply(hundred));
  }
}
