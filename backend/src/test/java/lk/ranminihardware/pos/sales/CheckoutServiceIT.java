package lk.ranminihardware.pos.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import lk.ranminihardware.pos.catalog.domain.Category;
import lk.ranminihardware.pos.catalog.domain.Product;
import lk.ranminihardware.pos.catalog.repository.CategoryRepository;
import lk.ranminihardware.pos.catalog.repository.ProductRepository;
import lk.ranminihardware.pos.sales.domain.Sale;
import lk.ranminihardware.pos.sales.domain.TenderMethod;
import lk.ranminihardware.pos.sales.repository.SaleRepository;
import lk.ranminihardware.pos.sales.service.CheckoutCommand;
import lk.ranminihardware.pos.sales.service.CheckoutOutcome;
import lk.ranminihardware.pos.sales.service.CheckoutService;
import lk.ranminihardware.pos.settings.domain.ShopSettings;
import lk.ranminihardware.pos.settings.repository.ShopSettingsRepository;
import lk.ranminihardware.pos.shared.error.ApiException;
import lk.ranminihardware.pos.support.MongoIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.data.mongodb.core.MongoTemplate;

/**
 * The invariants a till cannot get wrong.
 *
 * Each test here corresponds to a way a real shop loses money: selling stock it
 * does not have, charging a customer twice for one basket, or letting the
 * browser decide what something costs.
 */
class CheckoutServiceIT extends MongoIntegrationTest {

  @Autowired CheckoutService checkout;
  @Autowired ProductRepository products;
  @Autowired CategoryRepository categories;
  @Autowired SaleRepository sales;
  @Autowired ShopSettingsRepository settingsRepository;
  @Autowired CacheManager caches;
  @Autowired MongoTemplate mongo;

  private String productId;

  @BeforeEach
  void setUp() {
    sales.deleteAll();
    products.deleteAll();
    categories.deleteAll();
    settingsRepository.deleteAll();

    // Invoice counters are deliberately NOT reset by deleting sales: in a real
    // shop a receipt number must never be reused, even if a sale is removed. A
    // test asserting on the sequence therefore has to clear them explicitly.
    mongo.getCollection("counters").deleteMany(new org.bson.Document());
    caches.getCacheNames().forEach(name -> caches.getCache(name).clear());

    ShopSettings settings = ShopSettings.defaults();
    settings.getBusinessLogic().setTaxRate(new BigDecimal("15"));
    settingsRepository.save(settings);

    Category category =
        categories.save(
            Category.builder().name("Cement").slug("cement").displayOrder(1).active(true).build());

    Product product =
        Product.builder()
            .sku("CEM-001")
            .name("Cemex Portland 50kg")
            .categoryId(category.getId())
            .categoryName(category.getName())
            .unit("bags")
            .buyingPrice(new BigDecimal("1900.00"))
            .sellingPrice(new BigDecimal("2450.00"))
            .stock(10)
            .reorderLevel(5)
            .active(true)
            .build();
    product.refreshStatus();
    productId = products.save(product).getId();
  }

  @Test
  @DisplayName("the server prices the basket from the catalogue, not from the request")
  void serverPricesTheBasket() {
    Sale sale = checkout.checkout(command(2, new BigDecimal("10"))).sale();

    // 2 x 2450 = 4900, less 10% = 4410, plus 15% tax = 5071.50.
    assertThat(sale.getSubtotal()).isEqualByComparingTo("4900.00");
    assertThat(sale.getDiscountAmount()).isEqualByComparingTo("490.00");
    assertThat(sale.getTaxAmount()).isEqualByComparingTo("661.50");
    assertThat(sale.getTotal()).isEqualByComparingTo("5071.50");

    // Cost is frozen onto the line so a later price change cannot rewrite the
    // margin on a sale that already happened.
    assertThat(sale.getCostTotal()).isEqualByComparingTo("3800.00");
    assertThat(sale.getProfit()).isEqualByComparingTo("610.00");
  }

  @Test
  @DisplayName("stock is taken and the stored status follows it")
  void stockIsTakenAtomically() {
    checkout.checkout(command(6, null));

    Product after = products.findById(productId).orElseThrow();
    assertThat(after.getStock()).isEqualTo(4);
    // 4 is at or below the reorder level of 5, so the stored status must move.
    assertThat(after.getStatus().name()).isEqualTo("LOW_STOCK");
  }

  @Test
  @DisplayName("a sale larger than the stock is refused and takes nothing")
  void refusesToOversell() {
    assertThatThrownBy(() -> checkout.checkout(command(11, null)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("not enough");

    assertThat(products.findById(productId).orElseThrow().getStock()).isEqualTo(10);
    assertThat(sales.count()).isZero();
  }

  @Test
  @DisplayName("a line at its reorder level still sells, all the way down to zero")
  void sellsRightDownToZero() {
    // Down to exactly the reorder level of 5. Being "low" is a thing the shop
    // is told about, never a thing that stops a customer being served.
    checkout.checkout(command(5, null));
    assertThat(products.findById(productId).orElseThrow().getStatus().name())
        .isEqualTo("LOW_STOCK");

    // And on past it, in ones, to the last unit on the shelf.
    for (int i = 0; i < 5; i++) {
      checkout.checkout(command(1, null));
    }

    Product empty = products.findById(productId).orElseThrow();
    assertThat(empty.getStock()).isZero();
    assertThat(empty.getStatus().name()).isEqualTo("OUT_OF_STOCK");
    assertThat(sales.count()).isEqualTo(6);

    // Zero is the floor. Everything above it was sellable; nothing below it is.
    assertThatThrownBy(() -> checkout.checkout(command(1, null)))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("not enough");

    assertThat(products.findById(productId).orElseThrow().getStock()).isZero();
  }

  @Test
  @DisplayName("concurrent tills cannot sell the same last units twice")
  void concurrentSalesCannotOversell() throws Exception {
    // Ten units on the shelf, twenty tills each asking for one.
    int attempts = 20;
    AtomicInteger succeeded = new AtomicInteger();

    try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
      List<Callable<Void>> tasks =
          java.util.stream.IntStream.range(0, attempts)
              .<Callable<Void>>mapToObj(
                  i ->
                      () -> {
                        try {
                          checkout.checkout(command(1, null));
                          succeeded.incrementAndGet();
                        } catch (ApiException expected) {
                          // Out of stock: the correct outcome for the losers.
                        }
                        return null;
                      })
              .toList();

      for (Future<Void> future : pool.invokeAll(tasks)) {
        future.get();
      }
    }

    // Exactly the stock that existed was sold — no more, and never negative.
    assertThat(succeeded.get()).isEqualTo(10);
    assertThat(products.findById(productId).orElseThrow().getStock()).isZero();
    assertThat(sales.count()).isEqualTo(10);
  }

  @Test
  @DisplayName("a retried checkout returns the original sale instead of charging twice")
  void retryIsIdempotent() {
    CheckoutCommand first = command(2, null).withIdempotencyKey("till-1-retry");
    Sale original = checkout.checkout(first).sale();
    CheckoutOutcome retry = checkout.checkout(first);
    Sale retried = retry.sale();

    assertThat(retried.getId()).isEqualTo(original.getId());
    assertThat(retried.getInvoiceNumber()).isEqualTo(original.getInvoiceNumber());
    assertThat(sales.count()).isEqualTo(1);

    // The decisive assertion: the stock moved once, not twice.
    assertThat(products.findById(productId).orElseThrow().getStock()).isEqualTo(8);

    // And the retry says nothing about stock. The threshold, if one had been
    // crossed, was crossed by the attempt this one is repeating — warning the
    // cashier again would be a second alarm for a single event.
    assertThat(retry.notices()).isEmpty();
  }

  @Test
  @DisplayName("invoice numbers are sequential and unique")
  void invoiceNumbersAreSequential() {
    Sale first = checkout.checkout(command(1, null)).sale();
    Sale second = checkout.checkout(command(1, null)).sale();

    assertThat(first.getInvoiceNumber()).endsWith("-0001");
    assertThat(second.getInvoiceNumber()).endsWith("-0002");
    assertThat(first.getInvoiceNumber()).isNotEqualTo(second.getInvoiceNumber());
  }

  @Test
  @DisplayName("tendering less than the total is refused")
  void refusesShortTender() {
    CheckoutCommand short_ =
        new CheckoutCommand(
            List.of(new CheckoutCommand.Line(productId, 2)),
            null,
            TenderMethod.CASH,
            new BigDecimal("100.00"),
            null,
            "K. Silva",
            "POS Terminal 1",
            null);

    assertThatThrownBy(() -> checkout.checkout(short_))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("less than the total");

    // The refusal must not leave the shelf short.
    assertThat(products.findById(productId).orElseThrow().getStock()).isEqualTo(10);
  }

  @Test
  @DisplayName("an empty basket is refused")
  void refusesEmptyBasket() {
    CheckoutCommand empty =
        new CheckoutCommand(List.of(), null, TenderMethod.CASH, null, null, null, null, null);

    assertThatThrownBy(() -> checkout.checkout(empty)).isInstanceOf(ApiException.class);
  }

  // ---------------------------------------------------------------------
  // What the till tells the cashier about the shelf.
  //
  // The fixture holds 10 bags with a reorder level of 5, so "crossing" means
  // taking the stock from 6-or-more down to 5-or-fewer.
  // ---------------------------------------------------------------------

  @Test
  @DisplayName("the sale that reaches the reorder level warns the cashier")
  void warnsWhenTheSaleReachesTheReorderLevel() {
    // 10 - 5 = 5, which is exactly the reorder level.
    CheckoutOutcome outcome = checkout.checkout(command(5, null));

    assertThat(outcome.notices()).hasSize(1);

    var notice = outcome.notices().get(0);
    assertThat(notice.sku()).isEqualTo("CEM-001");
    assertThat(notice.remaining()).isEqualTo(5);
    assertThat(notice.reorderLevel()).isEqualTo(5);
    assertThat(notice.soldOut()).isFalse();
  }

  @Test
  @DisplayName("a sale that leaves the line comfortably stocked says nothing")
  void staysQuietWellAboveTheReorderLevel() {
    // 10 - 2 = 8, which is above the reorder level of 5.
    assertThat(checkout.checkout(command(2, null)).notices()).isEmpty();
  }

  @Test
  @DisplayName("a line that was already low does not warn again on every sale")
  void doesNotRepeatTheWarningOnceLow() {
    // First sale crosses; that one is worth an interruption.
    assertThat(checkout.checkout(command(5, null)).notices()).hasSize(1);

    // The next sale leaves it lower still, but the cashier has already been
    // told. This is the assertion that keeps the feature useful: a warning on
    // every subsequent transaction is a warning nobody reads.
    assertThat(checkout.checkout(command(1, null)).notices()).isEmpty();
  }

  @Test
  @DisplayName("emptying the shelf warns, and says so as sold out")
  void warnsWhenTheShelfIsEmptied() {
    CheckoutOutcome outcome = checkout.checkout(command(10, null));

    assertThat(outcome.notices()).hasSize(1);
    assertThat(outcome.notices().get(0).remaining()).isZero();
    assertThat(outcome.notices().get(0).soldOut()).isTrue();
  }

  @Test
  @DisplayName("going from low straight to empty warns a second time")
  void warnsAgainWhenLowBecomesEmpty() {
    // Low is a warning; empty is a different fact and a different message — the
    // cashier can no longer sell the line at all, and must stop offering it.
    assertThat(checkout.checkout(command(5, null)).notices()).hasSize(1);

    CheckoutOutcome emptied = checkout.checkout(command(5, null));
    assertThat(emptied.notices()).hasSize(1);
    assertThat(emptied.notices().get(0).soldOut()).isTrue();
  }

  private CheckoutCommand command(int quantity, BigDecimal discountPercent) {
    return new CheckoutCommand(
        List.of(new CheckoutCommand.Line(productId, quantity)),
        discountPercent,
        TenderMethod.CASH,
        null,
        null,
        "K. Silva",
        "POS Terminal 1",
        null);
  }
}
